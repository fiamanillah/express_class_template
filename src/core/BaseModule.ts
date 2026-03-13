// src/core/BaseModule.ts
import { Router } from "express";
import { Context } from "./Context";
import { IgnitorModule } from "./IgnitorModule";
import { AppLogger } from "./logging/logger";

// Registry interface for localized Dependency Injection
export interface ModuleDependencies {
  repositories: Map<string, any>;
  services: Map<string, any>;
  controllers: Map<string, any>;
}

export abstract class BaseModule implements IgnitorModule {
  public abstract readonly name: string;
  public abstract readonly version: string;
  public abstract readonly dependencies?: string[];

  protected router: Router;
  protected context!: Context;

  // Internal DI container for the module
  protected container: ModuleDependencies = {
    repositories: new Map(),
    services: new Map(),
    controllers: new Map(),
  };

  constructor() {
    this.router = Router();
  }

  /**
   * Initialize the module
   * Follows Clean Architecture Dependency Rule: from innermost layer to outermost layer
   */
  public async initialize(context: Context): Promise<void> {
    this.context = context;

    AppLogger.info(`Initializing module: ${this.name} v${this.version}`);

    // 1. Pre-init hooks
    await this.onBeforeInit();

    // 2. Data Access Layer (Innermost)
    await this.setupRepositories();

    // 3. Business Logic / Use Cases Layer
    await this.setupUseCases();

    // 4. Interface Adapters Layer (Controllers)
    await this.setupControllers();

    // 5. Delivery Layer (Routes)
    await this.setupRoutes();

    // 6. Post-init hooks
    await this.onAfterInit();

    AppLogger.info(`Module ${this.name} initialized successfully`);
  }

  // ==========================================
  // Abstract Methods (To be implemented by child modules)
  // ==========================================

  /**
   * Layer 1: Setup data access Repositories
   */
  protected abstract setupRepositories(): Promise<void>;

  /**
   * Layer 2: Setup business logic Services / Use Cases
   */
  protected abstract setupUseCases(): Promise<void>;

  /**
   * Layer 3: Setup Presentation Controllers
   */
  protected abstract setupControllers(): Promise<void>;

  /**
   * Layer 4: Wire HTTP routes to controllers
   */
  protected abstract setupRoutes(): Promise<void>;

  // ==========================================
  // Dependency Injection Helpers
  // ==========================================

  protected registerRepository(key: string, instance: any): void {
    this.container.repositories.set(key, instance);
  }

  protected getRepository<T>(key: string): T {
    return this.container.repositories.get(key) as T;
  }

  protected registerService(key: string, instance: any): void {
    this.container.services.set(key, instance);
  }

  protected getService<T>(key: string): T {
    return this.container.services.get(key) as T;
  }

  protected registerController(key: string, instance: any): void {
    this.container.controllers.set(key, instance);
  }

  protected getController<T>(key: string): T {
    return this.container.controllers.get(key) as T;
  }

  // ==========================================
  // Lifecycle Hooks & Utilities
  // ==========================================

  protected async onBeforeInit(): Promise<void> {}
  protected async onAfterInit(): Promise<void> {}

  public async onShutdown(): Promise<void> {
    AppLogger.info(`Shutting down module: ${this.name}`);
    await this.cleanup();
  }

  protected async cleanup(): Promise<void> {
    // Clear DI registries to prevent memory leaks during shutdown
    this.container.repositories.clear();
    this.container.services.clear();
    this.container.controllers.clear();
  }

  public getRouter(): Router {
    return this.router;
  }

  public getMetadata() {
    return {
      name: this.name,
      version: this.version,
      dependencies: this.dependencies || [],
    };
  }

  public async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    details?: any;
  }> {
    return { status: "healthy" };
  }
}
