// src/core/BaseRepository.ts
import { AppLogger } from "./logging/logger";
import { DatabaseError, NotFoundError } from "./errors/AppError";
import {
  FilterHandler,
  PaginationOptions,
  PaginationResult,
} from "@/types/types";
import { PrismaClient } from "@/generated/prisma/client";

export interface RepositoryOptions {
  enableSoftDelete?: boolean;
  enableAuditFields?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
}

type TransactionCallback<T> = (
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
) => Promise<T>;

export abstract class BaseRepository<
  TModel = any,
  TCreateInput = any,
  TUpdateInput = any,
> {
  protected prisma: PrismaClient;
  protected modelName: string;
  protected options: RepositoryOptions;
  protected filterMap: Record<string, FilterHandler> = {};

  constructor(
    prisma: PrismaClient,
    modelName: string,
    options: RepositoryOptions = {},
  ) {
    this.prisma = prisma;
    this.modelName = modelName;
    this.options = {
      enableSoftDelete: false,
      enableAuditFields: false,
      defaultPageSize: 10,
      maxPageSize: 1000,
      ...options,
    };
  }

  /**
   * Get the Prisma model delegate (e.g., this.prisma.user)
   */
  protected abstract getModel(): any;

  public async create(data: TCreateInput, include?: any): Promise<TModel> {
    try {
      const createData = this.prepareCreateData(data);
      return (await this.getModel().create({
        data: createData,
        include,
      })) as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "create");
    }
  }

  public async updateById(
    id: string | number,
    data: TUpdateInput,
    include?: any,
  ): Promise<TModel> {
    try {
      const updateData = this.prepareUpdateData(data);
      return (await this.getModel().update({
        where: { id },
        data: updateData,
        include,
      })) as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "updateById");
    }
  }

  public async deleteById(id: string | number): Promise<TModel> {
    try {
      if (this.options.enableSoftDelete) {
        return await this.softDelete(id);
      }
      return (await this.getModel().delete({
        where: { id },
      })) as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "deleteById");
    }
  }

  public async findMany(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: Record<string, "asc" | "desc">,
    include?: any,
  ): Promise<PaginationResult<TModel>> {
    try {
      const where = this.buildWhereClause(filters);
      const finalPagination = this.normalizePagination(pagination);
      const sort = orderBy || { id: "desc" };

      const [data, total] = await Promise.all([
        this.getModel().findMany({
          where,
          skip: finalPagination.offset,
          take: finalPagination.limit,
          orderBy: sort,
          include,
        }),
        this.getModel().count({ where }),
      ]);

      return this.buildPaginationResult(data, total, finalPagination);
    } catch (error) {
      return this.handleDatabaseError(error, "findMany");
    }
  }

  public async findById(
    id: string | number,
    include?: any,
  ): Promise<TModel | null> {
    try {
      const where = this.buildWhereClause({ id });
      return (await this.getModel().findFirst({
        where,
        include,
      })) as TModel | null;
    } catch (error) {
      return this.handleDatabaseError(error, "findById");
    }
  }

  public async findOne(filters: any, include?: any): Promise<TModel | null> {
    try {
      const where = this.buildWhereClause(filters);
      return (await this.getModel().findFirst({
        where,
        include,
      })) as TModel | null;
    } catch (error) {
      return this.handleDatabaseError(error, "findOne");
    }
  }

  public async exists(filters: any): Promise<boolean> {
    try {
      const where = this.buildWhereClause(filters);
      const count = await this.getModel().count({ where });
      return count > 0;
    } catch (error) {
      return this.handleDatabaseError(error, "exists");
    }
  }

  public async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      return this.handleDatabaseError(error, "transaction");
    }
  }

  // --- Private Helper Methods ---

  private async softDelete(id: string | number): Promise<TModel> {
    return (await this.getModel().update({
      where: { id },
      data: { deletedAt: new Date(), isDeleted: true },
    })) as TModel;
  }

  private normalizePagination(
    pagination?: Partial<PaginationOptions>,
  ): PaginationOptions {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(
      this.options.maxPageSize!,
      Math.max(1, pagination?.limit || this.options.defaultPageSize!),
    );
    return { page, limit, offset: (page - 1) * limit };
  }

  private buildPaginationResult<T>(
    data: T[],
    total: number,
    pagination: PaginationOptions,
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / pagination.limit);
    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  private buildWhereClause(filters: any): any {
    if (this.options.enableSoftDelete) return { ...filters, deletedAt: null };
    return filters;
  }

  private prepareCreateData(data: TCreateInput): any {
    if (this.options.enableAuditFields)
      return { ...data, createdAt: new Date(), updatedAt: new Date() };
    return data;
  }

  private prepareUpdateData(data: TUpdateInput): any {
    if (this.options.enableAuditFields)
      return { ...data, updatedAt: new Date() };
    return data;
  }

  private handleDatabaseError(error: any, operation: string): never {
    AppLogger.error(`Database error in ${this.modelName}.${operation}`, {
      error: error instanceof Error ? error.message : String(error),
      code: error.code,
    });

    if (error.code === "P2025") {
      throw new NotFoundError(`${this.modelName} not found`);
    }

    throw new DatabaseError(
      `Database operation failed during ${operation}`,
      process.env.NODE_ENV === "development"
        ? { originalError: error.message }
        : undefined,
    );
  }
}
