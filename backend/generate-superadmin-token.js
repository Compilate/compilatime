const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function generateSuperadminToken() {
    try {
        // Buscar el superadmin
        const superadmin = await prisma.superadmin.findFirst({
            where: {
                email: 'admin@compilatime.com'
            }
        });

        if (!superadmin) {
            console.error('❌ No se encontró el superadmin');
            return;
        }

        console.log('✅ Superadmin encontrado:', superadmin);

        // Generar token JWT
        const token = jwt.sign(
            {
                id: superadmin.id,
                email: superadmin.email,
                role: 'SUPERADMIN'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Token generado:');
        console.log(token);

        // Guardar token en archivo
        const fs = require('fs');
        fs.writeFileSync('token.txt', token);
        console.log('✅ Token guardado en token.txt');

        // Actualizar último login
        await prisma.superadmin.update({
            where: { id: superadmin.id },
            data: { lastLoginAt: new Date() }
        });

        console.log('✅ Último login actualizado');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateSuperadminToken();