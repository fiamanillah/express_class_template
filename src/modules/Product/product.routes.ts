import { Router, Request, Response } from 'express';
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';
import { authenticate } from '@/middleware/auth';

export class ProductRoutes {
    private router: Router;
    private controller: ProductController;

    constructor(controller: ProductController) {
        this.router = Router();
        this.controller = controller;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const createValidator = validateRequest({ body: ProductValidation.create });
        const updateValidator = validateRequest({ 
            params: ProductValidation.params.id, 
            body: ProductValidation.update 
        });
        const idValidator = validateRequest({ params: ProductValidation.params.id });

        // Define Routes
        this.router.post('/', authenticate, createValidator, asyncHandler((req, res) => this.controller.create(req, res)));
        this.router.get('/', authenticate, asyncHandler((req, res) => this.controller.getAll(req, res)));
        this.router.get('/:id', authenticate, idValidator, asyncHandler((req, res) => this.controller.getOne(req, res)));
        this.router.patch('/:id', authenticate, updateValidator, asyncHandler((req, res) => this.controller.update(req, res)));
        this.router.delete('/:id', authenticate, idValidator, asyncHandler((req, res) => this.controller.delete(req, res)));
    }

    public getRouter(): Router {
        return this.router;
    }
}
