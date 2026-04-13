/**
 * Prisma Database Seed
 * ====================
 * 
 * Seeds the database with initial data for development.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cabsystem.com' },
        update: {},
        create: {
            email: 'admin@cabsystem.com',
            password: adminPassword,
            firstName: 'System',
            lastName: 'Admin',
            phoneNumber: '+1000000001',
            role: 'ADMIN',
            isEmailVerified: true,
            isPhoneVerified: true,
            isActive: true,
            passwordHistory: {
                create: {
                    password: adminPassword,
                },
            },
        },
    });
    console.log(`✅ Admin user created: ${admin.email}`);

    // Create test customer
    const customerPassword = await bcrypt.hash('Customer123!', SALT_ROUNDS);
    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            email: 'customer@test.com',
            password: customerPassword,
            firstName: 'Test',
            lastName: 'Customer',
            phoneNumber: '+1000000002',
            role: 'CUSTOMER',
            isEmailVerified: true,
            isPhoneVerified: false,
            isActive: true,
            passwordHistory: {
                create: {
                    password: customerPassword,
                },
            },
        },
    });
    console.log(`✅ Customer user created: ${customer.email}`);

    // Create test driver
    const driverPassword = await bcrypt.hash('Driver123!', SALT_ROUNDS);
    const driver = await prisma.user.upsert({
        where: { email: 'driver@test.com' },
        update: {},
        create: {
            email: 'driver@test.com',
            password: driverPassword,
            firstName: 'Test',
            lastName: 'Driver',
            phoneNumber: '+1000000003',
            role: 'DRIVER',
            isEmailVerified: true,
            isPhoneVerified: true,
            isActive: true,
            passwordHistory: {
                create: {
                    password: driverPassword,
                },
            },
        },
    });
    console.log(`✅ Driver user created: ${driver.email}`);

    // Create service account for booking-service
    const servicePassword = await bcrypt.hash('ServiceSecret123!', SALT_ROUNDS);
    const bookingService = await prisma.user.upsert({
        where: { email: 'booking-service@internal.cabsystem.com' },
        update: {},
        create: {
            email: 'booking-service@internal.cabsystem.com',
            password: servicePassword,
            firstName: 'Booking',
            lastName: 'Service',
            phoneNumber: '+1000000100',
            role: 'SERVICE',
            isEmailVerified: true,
            isPhoneVerified: true,
            isActive: true,
            serviceId: 'booking-service',
            allowedServices: ['auth-service', 'driver-service', 'payment-service'],
            passwordHistory: {
                create: {
                    password: servicePassword,
                },
            },
        },
    });
    console.log(`✅ Service account created: ${bookingService.email}`);

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('   Admin:    admin@cabsystem.com / Admin123!');
    console.log('   Customer: customer@test.com / Customer123!');
    console.log('   Driver:   driver@test.com / Driver123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
