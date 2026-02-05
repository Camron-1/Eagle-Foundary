import { PrismaClient, UserRole, UserStatus, OrgStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/security.js';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Create University Admin
    const adminEmail = 'admin@ashland.edu';
    const adminPassword = await hashPassword('Admin123!');

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            passwordHash: adminPassword,
            role: UserRole.UNIVERSITY_ADMIN,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
        },
    });
    console.log(`Created/Found University Admin: ${admin.email}`);

    // 2. Create Student
    const studentEmail = 'student@ashland.edu';
    const studentPassword = await hashPassword('Student123!');

    const student = await prisma.user.upsert({
        where: { email: studentEmail },
        update: {},
        create: {
            email: studentEmail,
            passwordHash: studentPassword,
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            studentProfile: {
                create: {
                    firstName: 'John',
                    lastName: 'Doe',
                    major: 'Computer Science',
                    gradYear: 2026,
                    bio: 'Aspiring software engineer passionate about startups.',
                    skills: ['TypeScript', 'React', 'Node.js'],
                },
            },
        },
    });
    console.log(`Created/Found Student: ${student.email}`);

    // 3. Create Organization & Company Admin
    const companyEmail = 'founder@techcorp.com';
    const companyPassword = await hashPassword('Founder123!');

    // Create Org first
    const org = await prisma.org.upsert({
        where: { id: 'default-org-id' },
        update: {},
        create: {
            name: 'TechCorp Solutions',
            description: 'Leading provider of innovative tech solutions.',
            website: 'https://techcorp.com',
            status: OrgStatus.ACTIVE,
            isVerifiedBadge: true,
        }
    });

    const existingCompanyUser = await prisma.user.findUnique({ where: { email: companyEmail } });

    if (!existingCompanyUser) {
        const newOrg = await prisma.org.create({
            data: {
                name: 'TechCorp Solutions',
                description: 'Leading provider of innovative tech solutions.',
                website: 'https://techcorp.com',
                status: OrgStatus.ACTIVE,
                isVerifiedBadge: true,
            }
        });

        await prisma.user.create({
            data: {
                email: companyEmail,
                passwordHash: companyPassword,
                role: UserRole.COMPANY_ADMIN,
                status: UserStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                orgId: newOrg.id,
            }
        });
        console.log(`🏢 Created Company Admin: ${companyEmail} & Org: ${newOrg.name}`);
    } else {
        console.log(`🏢 Found Company Admin: ${companyEmail}`);
    }

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
