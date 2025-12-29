import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { config, env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import { AuthTokens } from '../../types/express';
import { sendEmail, emailTemplates } from '../../config/email';

// Servicio de autenticación para usuarios de empresa
export const loginCompanyUser = async (credentials: {
    companySlug: string;
    email: string;
    password: string;
}): Promise<{ user: any; tokens: AuthTokens }> => {
    const { companySlug, email, password } = credentials;

    // Buscar empresa por slug
    const company = await prisma.company.findUnique({
        where: { slug: companySlug, active: true },
    });

    if (!company) {
        throw new AppError('Empresa no encontrada o inactiva', 404, 'COMPANY_NOT_FOUND');
    }

    // Buscar usuario de empresa
    const companyUser = await prisma.companyUser.findFirst({
        where: {
            companyId: company.id,
            email: email.toLowerCase(),
            active: true,
        },
        include: {
            company: true,
        },
    });

    if (!companyUser) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, companyUser.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Actualizar último login
    await prisma.companyUser.update({
        where: { id: companyUser.id },
        data: { lastLoginAt: new Date() },
    });

    // Generar tokens
    const tokens = generateTokens({
        id: companyUser.id,
        type: 'company',
        companyId: company.id,
    });

    // Remover contraseña hash del response
    const { passwordHash, ...userWithoutPassword } = companyUser;

    return {
        user: userWithoutPassword,
        tokens,
    };
};

// Servicio de autenticación para usuarios de empresa sin código de empresa
export const loginCompanyUserWithoutSlug = async (credentials: {
    email: string;
    password: string;
}): Promise<{ user: any; company: any; tokens: AuthTokens }> => {
    const { email, password } = credentials;

    // Buscar usuario de empresa por email (sin importar la empresa)
    const companyUser = await prisma.companyUser.findFirst({
        where: {
            email: email.toLowerCase(),
            active: true,
        },
        include: {
            company: true,
        },
    });

    if (!companyUser) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar que la empresa esté activa
    if (!companyUser.company.active || !companyUser.company.isActive) {
        throw new AppError('Empresa inactiva', 401, 'COMPANY_INACTIVE');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, companyUser.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Actualizar último login
    await prisma.companyUser.update({
        where: { id: companyUser.id },
        data: { lastLoginAt: new Date() },
    });

    // Generar tokens
    const tokens = generateTokens({
        id: companyUser.id,
        type: 'company',
        companyId: companyUser.companyId,
    });

    // Remover contraseña hash del response
    const { passwordHash, ...userWithoutPassword } = companyUser;

    return {
        user: userWithoutPassword,
        company: companyUser.company,
        tokens,
    };
};

// Servicio de autenticación para empleados
export const loginEmployee = async (credentials: {
    companySlug: string;
    dni: string;
    pin: string;
}): Promise<{ user: any; tokens: AuthTokens }> => {
    const { companySlug, dni, pin } = credentials;

    // Buscar empresa por slug
    const company = await prisma.company.findUnique({
        where: { slug: companySlug, active: true },
    });

    if (!company) {
        throw new AppError('Empresa no encontrada o inactiva', 404, 'COMPANY_NOT_FOUND');
    }

    // Buscar empleado globalmente (sin importar la empresa)
    const employee = await prisma.employee.findFirst({
        where: {
            dni: dni.toUpperCase(),
            active: true,
        },
    });

    if (!employee) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar que el empleado tenga una relación con esta empresa
    const employeeCompany = await (prisma as any).employeeCompany.findFirst({
        where: {
            employeeId: employee.id,
            companyId: company.id,
            active: true,
        },
        include: {
            company: true,
            employee: {
                select: {
                    id: true,
                    dni: true,
                    name: true,
                    surname: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }
        }
    });

    if (!employeeCompany) {
        throw new AppError('El empleado no está asignado a esta empresa', 401, 'EMPLOYEE_NOT_ASSIGNED_TO_COMPANY');
    }

    // Verificar PIN
    const isPinValid = await bcrypt.compare(pin, employee.pin);
    if (!isPinValid) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Generar tokens
    const tokens = generateTokens({
        id: employee.id,
        type: 'employee',
        companyId: company.id,
    });

    // Preparar datos del usuario para el response
    const userWithoutSensitiveData = {
        ...employeeCompany.employee,
        // Añadir información específica de esta empresa
        employeeCode: employeeCompany.employeeCode,
        department: employeeCompany.department,
        position: employeeCompany.position,
        salary: employeeCompany.salary,
        hireDate: employeeCompany.hireDate,
        // Información de la empresa
        company: employeeCompany.company,
    };

    return {
        user: userWithoutSensitiveData,
        tokens,
    };
};

// Autenticación rápida para fichaje (solo DNI + PIN)
export const quickPunchAuth = async (credentials: {
    companySlug: string;
    dni: string;
    pin: string;
}): Promise<{ employee: any }> => {
    const { companySlug, dni, pin } = credentials;

    // Buscar empresa por slug
    const company = await prisma.company.findUnique({
        where: { slug: companySlug, active: true },
    });

    if (!company) {
        throw new AppError('Empresa no encontrada o inactiva', 404, 'COMPANY_NOT_FOUND');
    }

    // Buscar empleado globalmente
    const employee = await prisma.employee.findFirst({
        where: {
            dni: dni.toUpperCase(),
            active: true,
        },
    });

    if (!employee) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar que el empleado tenga una relación con esta empresa
    const employeeCompany = await (prisma as any).employeeCompany.findFirst({
        where: {
            employeeId: employee.id,
            companyId: company.id,
            active: true,
        },
        select: {
            id: true,
            employeeId: true,
            companyId: true,
            employeeCode: true,
            department: true,
            position: true,
            employee: {
                select: {
                    id: true,
                    dni: true,
                    name: true,
                    surname: true,
                    pin: true,
                },
            },
            company: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    timezone: true,
                },
            },
        },
    });

    if (!employeeCompany) {
        throw new AppError('El empleado no está asignado a esta empresa', 401, 'EMPLOYEE_NOT_ASSIGNED_TO_COMPANY');
    }

    // Verificar PIN
    const isPinValid = await bcrypt.compare(pin, employee.pin);
    if (!isPinValid) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    return {
        employee: {
            ...employeeCompany.employee,
            companyId: employeeCompany.companyId,
            employeeCode: employeeCompany.employeeCode,
            department: employeeCompany.department,
            position: employeeCompany.position,
            company: employeeCompany.company,
        }
    };
};

// Obtener empresas de un empleado
export const getEmployeeCompanies = async (dni: string): Promise<{
    id: string;
    name: string;
    slug: string;
    employeeCode: string;
    department: string;
    position: string;
    active: boolean;
}[]> => {
    // Buscar empleado
    const employee = await prisma.employee.findFirst({
        where: {
            dni: dni.toUpperCase(),
            active: true,
        },
    });

    if (!employee) {
        throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Obtener todas las empresas del empleado
    const employeeCompanies = await (prisma as any).employeeCompany.findMany({
        where: {
            employeeId: employee.id,
            active: true,
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    active: true,
                },
            },
        },
        orderBy: {
            company: {
                name: 'asc',
            },
        },
    });

    // Filtrar solo empresas activas
    return employeeCompanies
        .filter((ec: any) => ec.company.active)
        .map((ec: any) => ({
            id: ec.company.id,
            name: ec.company.name,
            slug: ec.company.slug,
            employeeCode: ec.employeeCode || '',
            department: ec.department || '',
            position: ec.position || '',
            active: ec.active,
        }));
};

// Generar tokens JWT
const generateTokens = (payload: {
    id: string;
    type: 'company' | 'employee';
    companyId: string;
}): AuthTokens => {
    // Usando any para evitar problemas de tipos con jwt.sign
    const accessToken = (jwt as any).sign(
        {
            id: payload.id,
            type: payload.type,
            companyId: payload.companyId,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = (jwt as any).sign(
        {
            id: payload.id,
            type: payload.type,
            companyId: payload.companyId,
            refresh: true,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Calcular tiempo de expiración en segundos
    const expiresIn = jwt.decode(accessToken) as any;
    const expirationTime = expiresIn.exp - Math.floor(Date.now() / 1000);

    return {
        accessToken,
        refreshToken,
        expiresIn: expirationTime,
    };
};

// Refrescar token de acceso
export const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens> => {
    try {
        const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

        if (!decoded.refresh) {
            throw new AppError('Token de refresh inválido', 401, 'INVALID_REFRESH_TOKEN');
        }

        // Verificar que el usuario aún existe y está activo
        let user;
        if (decoded.type === 'company') {
            user = await prisma.companyUser.findFirst({
                where: {
                    id: decoded.id,
                    companyId: decoded.companyId,
                    active: true,
                },
            });
        } else if (decoded.type === 'employee') {
            // Para empleados, verificamos que exista y esté activo
            // La relación con la empresa se verificará en el middleware
            user = await prisma.employee.findFirst({
                where: {
                    id: decoded.id,
                    active: true,
                },
            });
        }

        if (!user) {
            throw new AppError('Usuario no encontrado o inactivo', 401, 'USER_NOT_FOUND');
        }

        // Generar nuevos tokens
        return generateTokens({
            id: decoded.id,
            type: decoded.type,
            companyId: decoded.companyId,
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Token de refresh inválido', 401, 'INVALID_REFRESH_TOKEN');
        }
        throw error;
    }
};

// Verificar token sin lanzar error
export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        return null;
    }
};

// Cambiar contraseña de usuario de empresa
export const changeCompanyUserPassword = async (
    userId: string,
    companyId: string,
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    // Buscar usuario
    const user = await prisma.companyUser.findFirst({
        where: {
            id: userId,
            companyId: companyId,
            active: true,
        },
    });

    if (!user) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
        throw new AppError('Contraseña actual incorrecta', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Hashear nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Actualizar contraseña
    await prisma.companyUser.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
    });
};

// Cambiar PIN de empleado
export const changeEmployeePin = async (
    employeeId: string,
    companyId: string,
    currentPin: string,
    newPin: string
): Promise<void> => {
    // Buscar empleado y verificar que tenga relación con la empresa
    const employeeCompany = await (prisma as any).employeeCompany.findFirst({
        where: {
            employeeId: employeeId,
            companyId: companyId,
            active: true,
        },
        include: {
            employee: true,
        },
    });

    if (!employeeCompany) {
        throw new AppError('Empleado no encontrado o no asignado a esta empresa', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const employee = employeeCompany.employee;

    if (!employee) {
        throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Verificar PIN actual
    const isCurrentPinValid = await bcrypt.compare(currentPin, employee.pin);
    if (!isCurrentPinValid) {
        throw new AppError('PIN actual incorrecto', 400, 'INVALID_CURRENT_PIN');
    }

    // Hashear nuevo PIN (usamos menos rounds para PINs que son más cortos)
    const newPinHash = await bcrypt.hash(newPin, 10);

    // Actualizar PIN
    await prisma.employee.update({
        where: { id: employeeId },
        data: { pin: newPinHash },
    });
};

// Restablecer contraseña de usuario de empresa
export const resetCompanyUserPassword = async (
    companyId: string,
    email: string
): Promise<{ resetToken: string }> => {
    // Buscar usuario
    const user = await prisma.companyUser.findFirst({
        where: {
            companyId: companyId,
            email: email.toLowerCase(),
            active: true,
        },
    });

    if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        return { resetToken: '' };
    }

    // Generar token de reseteo (válido por 1 hora)
    const resetToken = jwt.sign(
        {
            id: user.id,
            type: 'password_reset',
            companyId: companyId,
        },
        config.jwt.secret,
        { expiresIn: '1h' }
    );

    // Enviar email con el token de reseteo
    if (config.email.enabled) {
        const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        await sendEmail({
            to: user.email,
            ...emailTemplates.passwordReset(resetLink)
        });
    }

    return { resetToken };
};

// Confirmar restablecimiento de contraseña
export const confirmPasswordReset = async (
    resetToken: string,
    newPassword: string
): Promise<void> => {
    try {
        const decoded = jwt.verify(resetToken, config.jwt.secret) as any;

        if (decoded.type !== 'password_reset') {
            throw new AppError('Token de reseteo inválido', 400, 'INVALID_RESET_TOKEN');
        }

        // Hashear nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

        // Actualizar contraseña
        await prisma.companyUser.update({
            where: { id: decoded.id },
            data: { passwordHash: newPasswordHash },
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Token de reseteo inválido o expirado', 400, 'INVALID_RESET_TOKEN');
        }
        throw error;
    }
};

// Servicio de autenticación para empleados multi-empresa
export const loginEmployeeMultiCompany = async (credentials: {
    dni: string;
    pin: string;
    companyId: string;
}): Promise<{ user: any; tokens: AuthTokens }> => {
    const { dni, pin, companyId } = credentials;

    // Buscar empresa por ID
    const company = await prisma.company.findUnique({
        where: { id: companyId, active: true },
    });

    if (!company) {
        throw new AppError('Empresa no encontrada o inactiva', 404, 'COMPANY_NOT_FOUND');
    }

    // Buscar empleado globalmente (sin importar la empresa)
    const employee = await prisma.employee.findFirst({
        where: {
            dni: dni.toUpperCase(),
            active: true,
        },
    });

    if (!employee) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar que el empleado tenga una relación con esta empresa
    const employeeCompany = await (prisma as any).employeeCompany.findFirst({
        where: {
            employeeId: employee.id,
            companyId: company.id,
            active: true,
        },
        include: {
            company: true,
            employee: {
                select: {
                    id: true,
                    dni: true,
                    name: true,
                    surname: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }
        }
    });

    if (!employeeCompany) {
        throw new AppError('El empleado no está asignado a esta empresa', 401, 'EMPLOYEE_NOT_ASSIGNED_TO_COMPANY');
    }

    // Verificar PIN
    const isPinValid = await bcrypt.compare(pin, employee.pin);
    if (!isPinValid) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Generar tokens
    const tokens = generateTokens({
        id: employee.id,
        type: 'employee',
        companyId: company.id,
    });

    // Preparar datos del usuario para el response
    const userWithoutSensitiveData = {
        ...employeeCompany.employee,
        // Añadir información específica de esta empresa
        employeeCode: employeeCompany.employeeCode,
        department: employeeCompany.department,
        position: employeeCompany.position,
        salary: employeeCompany.salary,
        hireDate: employeeCompany.hireDate,
        // Información de la empresa
        company: employeeCompany.company,
    };

    return {
        user: userWithoutSensitiveData,
        tokens,
    };
};

export default {
    loginCompanyUser,
    loginCompanyUserWithoutSlug,
    loginEmployee,
    loginEmployeeMultiCompany,
    quickPunchAuth,
    getEmployeeCompanies,
    refreshAccessToken,
    verifyToken,
    changeCompanyUserPassword,
    changeEmployeePin,
    resetCompanyUserPassword,
    confirmPasswordReset,
};