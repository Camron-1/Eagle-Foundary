import { PrismaClient, UserRole, UserStatus, OrgStatus, OrgVerificationStatus, StartupStatus, OpportunityStatus, ProjectStatus, ApplicationStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/security.js';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    const defaultPassword = await hashPassword('Password123!');
    const adminPassword = await hashPassword('Admin123!');

    // 1. Create University Admin
    const adminEmail = 'admin@ashland.edu';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash: adminPassword },
        create: {
            email: adminEmail,
            passwordHash: adminPassword,
            role: 'UNIVERSITY_ADMIN',
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
        },
    });
    console.log(`Created University Admin: ${admin.email}`);

    // 2. Create Organizations
    const orgsData = [
        { name: 'TechCorp Solutions', domain: 'techcorp.com', email: 'founder@techcorp.com' },
        { name: 'Acme Innovations', domain: 'acme.io', email: 'admin@acme.io' },
        { name: 'Global Finance', domain: 'globalfinance.com', email: 'hr@globalfinance.com' }
    ];

    const orgs = [];
    for (const data of orgsData) {
        const org = await prisma.org.create({
            data: {
                name: data.name,
                description: `Leading provider in the ${data.name.split(' ')[0]} space.`,
                website: `https://${data.domain}`,
                status: 'ACTIVE',
                isVerifiedBadge: true,
                verificationStatus: 'APPROVED',
                verifiedDomains: [data.domain],
            }
        });
        
        await prisma.user.upsert({
            where: { email: data.email },
            update: { orgId: org.id },
            create: {
                email: data.email,
                passwordHash: defaultPassword,
                role: 'COMPANY_ADMIN',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                orgId: org.id,
            }
        });

        // Add a company member
        await prisma.user.upsert({
            where: { email: `member@${data.domain}` },
            update: { orgId: org.id },
            create: {
                email: `member@${data.domain}`,
                passwordHash: defaultPassword,
                role: 'COMPANY_MEMBER',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                orgId: org.id,
            }
        });

        console.log(`Created Org: ${org.name} with Admin: ${data.email} and Member: member@${data.domain}`);
        orgs.push(org);
    }

    // 3. Create Students
    const studentsData = [
        { first: 'John', last: 'Doe', email: 'student@ashland.edu', major: 'Computer Science', year: 2026 },
        { first: 'Jane', last: 'Smith', email: 'jsmith@ashland.edu', major: 'Business', year: 2025 },
        { first: 'Alice', last: 'Johnson', email: 'ajohnson@ashland.edu', major: 'Engineering', year: 2027 },
        { first: 'Bob', last: 'Williams', email: 'bwilliams@ashland.edu', major: 'Design', year: 2026 },
        { first: 'Charlie', last: 'Brown', email: 'cbrown@ashland.edu', major: 'Marketing', year: 2025 }
    ];

    const studentProfiles = [];
    for (const data of studentsData) {
        const password = data.email === 'student@ashland.edu' ? await hashPassword('Student123!') : defaultPassword;
        const student = await prisma.user.upsert({
            where: { email: data.email },
            update: { passwordHash: password },
            create: {
                email: data.email,
                passwordHash: password,
                role: 'STUDENT',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                studentProfile: {
                    create: {
                        firstName: data.first,
                        lastName: data.last,
                        major: data.major,
                        gradYear: data.year,
                        bio: `Hi, I'm ${data.first}, an ambitious student looking for opportunities.`,
                        skills: ['Communication', 'Leadership', 'Problem Solving'],
                    },
                },
            },
            include: { studentProfile: true }
        });

        studentProfiles.push(student.studentProfile);
        console.log(`Created Student: ${student.email}`);
    }

    // 4. Create Startups
    const startupsData = [
        { name: 'EcoTrack', desc: 'Tracking carbon footprint.', stage: 'Pre-seed', founder: studentProfiles[0] },
        { name: 'LearnLink', desc: 'Connecting peer tutors.', stage: 'Idea', founder: studentProfiles[1] },
    ];

    for (const data of startupsData) {
        if (!data.founder) continue;
        
        const startup = await prisma.startup.create({
            data: {
                name: data.name,
                description: data.desc,
                stage: data.stage,
                status: 'APPROVED',
                tags: ['Tech', 'Education', 'Green'],
                acceptingJoinRequests: true,
                members: {
                    create: {
                        profileId: data.founder.id,
                        role: 'founder'
                    }
                }
            }
        });
        console.log(`Created Startup: ${startup.name}`);
    }

    // 5. Create Opportunities and Projects
    for (const org of orgs) {
        // Opportunity
        const opp = await prisma.opportunity.create({
            data: {
                orgId: org.id,
                title: `${org.name} Summer Internship`,
                description: 'Join us for a 10-week summer program.',
                status: 'PUBLISHED',
                budgetType: 'paid',
                publishedAt: new Date(),
            }
        });

        // Project
        const proj = await prisma.project.create({
            data: {
                orgId: org.id,
                title: `${org.name} Market Analysis`,
                description: 'Analyze competitors in our sector.',
                status: 'PUBLISHED',
                publishedAt: new Date(),
            }
        });

        console.log(`Created Opportunity and Project for ${org.name}`);

        // Create some applications
        if (studentProfiles[0] && studentProfiles[1]) {
            await prisma.application.create({
                data: {
                    opportunityId: opp.id,
                    profileId: studentProfiles[0].id,
                    status: 'SUBMITTED',
                    coverLetter: 'I am highly interested in this role.'
                }
            });

            await prisma.projectSubmission.create({
                data: {
                    projectId: proj.id,
                    profileId: studentProfiles[1].id,
                    status: 'SUBMITTED',
                    coverLetter: 'I think I can deliver this project nicely.'
                }
            });
        }
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
