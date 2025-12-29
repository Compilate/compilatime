import { Request, Response } from 'express';
import { CompanyService } from './company.service';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const companyService = new CompanyService();

// Esquemas de validación con Zod
const createCompanySchema = z.object({
    name: z.string().min(1, 'El nombre de la empresa es requerido'),
    slug: z.string().min(1, 'El código de la empresa es requerido'),
    email: z.string().email('El email debe ser válido'),
    phone: z.string().optional(),
    address: z.string().optional(),
    logo: z.string().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    geofenceRadius: z.number().optional(),
    requireGeolocation: z.boolean().optional(),
    autoPunchoutEnabled: z.boolean().optional(),
    autoPunchoutMaxMinutes: z.number().optional(),
    autoPunchoutMarginBefore: z.number().optional(),
    autoPunchoutMarginAfter: z.number().optional(),
    enableEmployeePortal: z.boolean().optional(),
    settings: z.any().optional()
});

const updateCompanySchema = z.object({
    name: z.string().min(1, 'El nombre de la empresa es requerido').optional(),
    slug: z.string().min(1, 'El código de la empresa es requerido').optional(),
    email: z.string().email('El email debe ser válido').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    logo: z.string().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    geofenceRadius: z.number().optional(),
    requireGeolocation: z.boolean().optional(),
    autoPunchoutEnabled: z.boolean().optional(),
    autoPunchoutMaxMinutes: z.number().optional(),
    autoPunchoutMarginBefore: z.number().optional(),
    autoPunchoutMarginAfter: z.number().optional(),
    enableEmployeePortal: z.boolean().optional(),
    settings: z.any().optional(),
    active: z.boolean().optional(),
    isActive: z.boolean().optional(),
    suspensionReason: z.string().optional()
});

const suspendCompanySchema = z.object({
    reason: z.string().min(1, 'El motivo de la suspensión es requerido')
});

const createDefaultSuperadminEmployeeSchema = z.object({
    dni: z.string().min(9, 'El DNI debe tener al menos 9 caracteres'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    surname: z.string().optional(),
    email: z.string().email('El email debe ser válido').optional(),
    phone: z.string().optional(),
    pin: z.string().min(4, 'El PIN debe tener al menos 4 caracteres'),
    department: z.string().optional(),
    position: z.string().optional(),
    salary: z.number().optional()
});

export class CompanyController {
    // Obtener todas las empresas
    getAllCompanies = asyncHandler(async (_req: Request, res: Response) => {
        const companies = await companyService.getAllCompanies();

        ApiResponse.success(res, companies, 'Empresas obtenidas correctamente');
    });

    // Obtener una empresa por ID
    getCompanyById = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const company = await companyService.getCompanyById(id);

        ApiResponse.success(res, company, 'Empresa obtenida correctamente');
    });

    // Obtener una empresa por slug (código de empresa)
    getCompanyBySlug = asyncHandler(async (req: Request, res: Response) => {
        const { slug } = req.params;

        const company = await companyService.getCompanyBySlug(slug);

        ApiResponse.success(res, company, 'Empresa obtenida correctamente');
    });

    // Crear una nueva empresa
    createCompany = asyncHandler(async (req: Request, res: Response) => {
        const companyData = createCompanySchema.parse(req.body);

        const newCompany = await companyService.createCompany(companyData);

        ApiResponse.success(res, newCompany, 'Empresa creada correctamente', 201);
    });

    // Actualizar una empresa
    updateCompany = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const companyData = updateCompanySchema.parse(req.body);

        const updatedCompany = await companyService.updateCompany(id, companyData);

        ApiResponse.success(res, updatedCompany, 'Empresa actualizada correctamente');
    });

    // Suspender una empresa
    suspendCompany = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { reason } = suspendCompanySchema.parse(req.body);

        const suspendedCompany = await companyService.suspendCompany(id, reason);

        ApiResponse.success(res, suspendedCompany, 'Empresa suspendida correctamente');
    });

    // Reactivar una empresa
    reactivateCompany = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const reactivatedCompany = await companyService.reactivateCompany(id);

        ApiResponse.success(res, reactivatedCompany, 'Empresa reactivada correctamente');
    });

    // Eliminar una empresa
    deleteCompany = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        await companyService.deleteCompany(id);

        ApiResponse.success(res, null, 'Empresa eliminada correctamente');
    });

    // Obtener estadísticas de empresas
    getCompaniesStats = asyncHandler(async (_req: Request, res: Response) => {
        console.log('🔍 [getCompaniesStats] Controller: Iniciando obtención de estadísticas...');
        try {
            const stats = await companyService.getCompaniesStats();
            console.log('🔍 [getCompaniesStats] Controller: Estadísticas obtenidas:', stats);
            console.log('🔍 [getCompaniesStats] Controller: Enviando respuesta exitosa...');
            ApiResponse.success(res, stats, 'Estadísticas de empresas obtenidas correctamente');
        } catch (error) {
            console.error('❌ [getCompaniesStats] Controller: Error al obtener estadísticas:', error);
            throw error;
        }
    });

    // Obtener empresas con suscripción próxima a expirar
    getCompaniesWithExpiringSubscription = asyncHandler(async (req: Request, res: Response) => {
        const days = parseInt(req.query.days as string) || 30;

        const companies = await companyService.getCompaniesWithExpiringSubscription(days);

        ApiResponse.success(res, companies, 'Empresas con suscripción próxima a expirar obtenidas correctamente');
    });

    // Actualizar configuración de la empresa
    updateCompanySettings = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return ApiResponse.error(res, 'No autorizado', 401);
        }

        const companyData = updateCompanySchema.parse(req.body);

        const updatedCompany = await companyService.updateCompany(companyId, companyData);

        ApiResponse.success(res, updatedCompany, 'Configuración de la empresa actualizada correctamente');
    });

    // Crear empleado super admin por defecto para una empresa
    createDefaultSuperadminEmployee = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const employeeData = createDefaultSuperadminEmployeeSchema.parse(req.body);

        const result = await companyService.createDefaultSuperadminEmployee(id, employeeData);

        ApiResponse.success(res, result, 'Empleado super admin creado correctamente', 201);
    });
}