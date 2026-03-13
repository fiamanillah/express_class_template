// src/core/BaseController.ts
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { ApiResponse, PaginatedResponse } from "@/types/types";

export abstract class BaseController {
  /**
   * Send a standard successful response
   */
  protected sendResponse<T>(
    req: Request,
    res: Response,
    message?: string,
    statusCode: HTTPStatusCode = HTTPStatusCode.OK,
    data?: T,
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      meta: {
        // Assuming you fixed the Express Request types in express.d.ts!
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
      data,
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   */
  protected sendPaginatedResponse<T>(
    req: Request,
    res: Response,
    pagination: PaginatedResponse<T>["meta"]["pagination"],
    message?: string,
    data?: T[],
  ): Response<PaginatedResponse<T>> {
    const response: PaginatedResponse<T> = {
      success: true,
      message,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        pagination,
      },
      data,
    };

    return res.status(HTTPStatusCode.OK).json(response);
  }

  /**
   * Send a 201 Created response
   */
  protected sendCreatedResponse<T>(
    req: Request,
    res: Response,
    data: T,
    message: string = "Resource created successfully",
  ): Response<ApiResponse<T>> {
    return this.sendResponse(req, res, message, HTTPStatusCode.CREATED, data);
  }

  /**
   * Send a 204 No Content response
   */
  protected sendNoContentResponse(res: Response): Response {
    return res.status(HTTPStatusCode.NO_CONTENT).send();
  }

  /**
   * Standardize extracting pagination parameters from query string
   */
  protected extractPaginationParams(req: Request): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }
}
