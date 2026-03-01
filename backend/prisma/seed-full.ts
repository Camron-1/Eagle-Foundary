/**
 * Full seed script for local testing.
 *
 * Creates:
 *   - 1 University Admin
 *   - 5 Students (with profiles, skills, portfolios)
 *   - 3 Companies / Orgs (with admins and members)
 *   - 4 Startups (DRAFT, SUBMITTED, APPROVED, NEEDS_CHANGES)
 *   - 5 Opportunities (DRAFT, PUBLISHED × 3, CLOSED)
 *   - Applications, Join Requests, Messages, Notifications
 *
 * All passwords: Test1234!
 *
 * Run:  npx tsx prisma/seed-full.ts
 */

import {
    PrismaClient,
    UserRole,
    UserStatus,
    OrgStatus,
    OrgVerificationStatus,
    StartupStatus,
    OpportunityStatus,
    ApplicationStatus,
    JoinRequestStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD_HASH = bcrypt.hashSync('Test1234!', 12);

// ─── helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(
    email: string,
    role: UserRole,
    orgId?: string,
) {
    return prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            passwordHash: PASSWORD_HASH,
            role,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            orgId: orgId ?? null,
        },
    });
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Starting full seed...\n');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. UNIVERSITY ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    const admin = await upsertUser('admin@ashland.edu', UserRole.UNIVERSITY_ADMIN);
    console.log(`👑 Admin:   admin@ashland.edu / Test1234!`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. STUDENTS (5)
    // ═══════════════════════════════════════════════════════════════════════════
    const studentData = [
        {
            email: 'alice@ashland.edu',
            first: 'Alice',
            last: 'Johnson',
            major: 'Computer Science',
            gradYear: 2026,
            bio: 'Full-stack developer passionate about building scalable web applications and open-source tools.',
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
            linkedinUrl: 'https://linkedin.com/in/alicejohnson',
            githubUrl: 'https://github.com/alicejohnson',
        },
        {
            email: 'bob@ashland.edu',
            first: 'Bob',
            last: 'Martinez',
            major: 'Business Administration',
            gradYear: 2025,
            bio: 'Entrepreneurship enthusiast with experience in market research and business development.',
            skills: ['Market Research', 'Financial Modeling', 'Pitch Decks', 'Sales Strategy'],
            linkedinUrl: 'https://linkedin.com/in/bobmartinez',
            githubUrl: null,
        },
        {
            email: 'carol@ashland.edu',
            first: 'Carol',
            last: 'Chen',
            major: 'Data Science',
            gradYear: 2027,
            bio: 'Machine learning researcher focused on NLP and recommendation systems.',
            skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Statistics', 'NLP'],
            linkedinUrl: 'https://linkedin.com/in/carolchen',
            githubUrl: 'https://github.com/carolchen',
        },
        {
            email: 'dave@ashland.edu',
            first: 'Dave',
            last: 'Williams',
            major: 'Graphic Design',
            gradYear: 2026,
            bio: 'UI/UX designer who loves creating intuitive and accessible digital experiences.',
            skills: ['Figma', 'Adobe XD', 'UI/UX Design', 'Prototyping', 'User Research'],
            linkedinUrl: 'https://linkedin.com/in/davewilliams',
            githubUrl: null,
        },
        {
            email: 'emma@ashland.edu',
            first: 'Emma',
            last: 'Taylor',
            major: 'Cybersecurity',
            gradYear: 2025,
            bio: 'Security-focused developer with CTF competition experience and a passion for application security.',
            skills: ['Penetration Testing', 'Python', 'Linux', 'Network Security', 'OWASP', 'Go'],
            linkedinUrl: 'https://linkedin.com/in/emmataylor',
            githubUrl: 'https://github.com/emmataylor',
        },
    ];

    const students: Record<string, { userId: string; profileId: string }> = {};

    for (const s of studentData) {
        const user = await upsertUser(s.email, UserRole.STUDENT);

        const profile = await prisma.studentProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                firstName: s.first,
                lastName: s.last,
                major: s.major,
                gradYear: s.gradYear,
                bio: s.bio,
                skills: s.skills,
                linkedinUrl: s.linkedinUrl ?? undefined,
                githubUrl: s.githubUrl ?? undefined,
            },
        });

        students[s.email] = { userId: user.id, profileId: profile.id };
        console.log(`🎓 Student: ${s.email} / Test1234!  (${s.first} ${s.last})`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. PORTFOLIO ITEMS  (for Alice and Carol)
    // ═══════════════════════════════════════════════════════════════════════════
    const aliceProfile = students['alice@ashland.edu'].profileId;
    const carolProfile = students['carol@ashland.edu'].profileId;

    const existingPortfolio = await prisma.portfolioItem.count({
        where: { profileId: { in: [aliceProfile, carolProfile] } },
    });

    if (existingPortfolio === 0) {
        await prisma.portfolioItem.createMany({
            data: [
                {
                    profileId: aliceProfile,
                    title: 'Open Source CLI Tool',
                    description: 'A command-line tool for automating deployment workflows, built with Node.js. 200+ GitHub stars.',
                    url: 'https://github.com/alicejohnson/deploy-cli',
                },
                {
                    profileId: aliceProfile,
                    title: 'E-Commerce Dashboard',
                    description: 'Full-stack analytics dashboard for an e-commerce platform. React + Express + PostgreSQL.',
                    url: 'https://alice-dashboard.vercel.app',
                },
                {
                    profileId: carolProfile,
                    title: 'Sentiment Analysis API',
                    description: 'REST API for real-time sentiment analysis of social media posts using BERT fine-tuned on 50k tweets.',
                    url: 'https://github.com/carolchen/sentiment-api',
                },
                {
                    profileId: carolProfile,
                    title: 'Movie Recommender System',
                    description: 'Collaborative filtering recommendation engine with 92% accuracy on the MovieLens dataset.',
                    url: 'https://github.com/carolchen/movie-rec',
                },
            ],
        });
        console.log(`\n📂 Created 4 portfolio items for Alice and Carol`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. ORGANIZATIONS & COMPANY USERS (3 orgs, 5 company users)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    async function upsertOrg(name: string, data: Omit<Parameters<typeof prisma.org.create>[0]['data'], 'name'>) {
        const existing = await prisma.org.findFirst({ where: { name } });
        if (existing) return existing;
        return prisma.org.create({ data: { name, ...data } });
    }

    // Org 1: TechNova
    const techNova = await upsertOrg('TechNova Solutions', {
        description: 'AI-powered SaaS platform helping startups automate their operations. Series A funded, 50+ employees.',
        website: 'https://technova.io',
        status: OrgStatus.ACTIVE,
        isVerifiedBadge: true,
        verificationStatus: OrgVerificationStatus.APPROVED,
        verifiedDomains: ['technova.io'],
    });
    const techNovaAdmin = await upsertUser('ceo@technova.io', UserRole.COMPANY_ADMIN, techNova.id);
    const techNovaMember = await upsertUser('hr@technova.io', UserRole.COMPANY_MEMBER, techNova.id);
    console.log(`🏢 Org:     TechNova Solutions (verified)`);
    console.log(`   Admin:  ceo@technova.io / Test1234!`);
    console.log(`   Member: hr@technova.io / Test1234!`);

    // Org 2: GreenBridge
    const greenBridge = await upsertOrg('GreenBridge Ventures', {
        description: 'Sustainability consulting firm focused on helping university startups go green. B-Corp certified.',
        website: 'https://greenbridge.co',
        status: OrgStatus.ACTIVE,
        isVerifiedBadge: false,
        verificationStatus: OrgVerificationStatus.APPROVED,
        verifiedDomains: ['greenbridge.co'],
    });
    const greenBridgeAdmin = await upsertUser('founder@greenbridge.co', UserRole.COMPANY_ADMIN, greenBridge.id);
    console.log(`🏢 Org:     GreenBridge Ventures`);
    console.log(`   Admin:  founder@greenbridge.co / Test1234!`);

    // Org 3: DesignCraft
    const designCraft = await upsertOrg('DesignCraft Studio', {
        description: 'Award-winning design agency offering branding, UI/UX, and product design services.',
        website: 'https://designcraft.studio',
        status: OrgStatus.ACTIVE,
        isVerifiedBadge: true,
        verificationStatus: OrgVerificationStatus.APPROVED,
        verifiedDomains: ['designcraft.studio'],
    });
    const designCraftAdmin = await upsertUser('lead@designcraft.studio', UserRole.COMPANY_ADMIN, designCraft.id);
    console.log(`🏢 Org:     DesignCraft Studio (verified)`);
    console.log(`   Admin:  lead@designcraft.studio / Test1234!`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. STARTUPS (4, various statuses)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    async function upsertStartup(name: string, data: Omit<Parameters<typeof prisma.startup.create>[0]['data'], 'name'>) {
        const existing = await prisma.startup.findFirst({ where: { name } });
        if (existing) return existing;
        return prisma.startup.create({ data: { name, ...data } });
    }

    // Startup 1: APPROVED — founded by Alice, Bob is a member
    const campusEats = await upsertStartup('CampusEats', {
        tagline: 'Peer-to-peer meal sharing for college students',
        description:
            'CampusEats connects students who love cooking with those who need affordable, home-cooked meals. Our platform handles ordering, payments, and delivery within campus. We have 300+ active users across 3 dorms.',
        stage: 'MVP',
        tags: ['Food Tech', 'Marketplace', 'Student Life'],
        status: StartupStatus.APPROVED,
        members: {
            create: [
                { profileId: students['alice@ashland.edu'].profileId, role: 'founder' },
                { profileId: students['bob@ashland.edu'].profileId, role: 'member' },
            ],
        },
    });
    console.log(`🚀 Startup: CampusEats (APPROVED) — founder: Alice, member: Bob`);

    // Startup 2: SUBMITTED — founded by Carol
    const dataLens = await upsertStartup('DataLens', {
        tagline: 'No-code data visualization for researchers',
        description:
            'DataLens makes it easy for non-technical researchers to create publication-ready visualizations from their datasets. Upload a CSV, choose a chart type, and export to SVG/PNG. We are seeking beta testers from the biology and psychology departments.',
        stage: 'Idea',
        tags: ['EdTech', 'Data Science', 'Research Tools'],
        status: StartupStatus.SUBMITTED,
        members: {
            create: [
                { profileId: students['carol@ashland.edu'].profileId, role: 'founder' },
            ],
        },
    });
    console.log(`🚀 Startup: DataLens (SUBMITTED) — founder: Carol`);

    // Startup 3: DRAFT — founded by Dave
    const artBoard = await upsertStartup('ArtBoard', {
        tagline: 'Digital portfolio builder for creative students',
        description:
            'ArtBoard helps art and design students create stunning online portfolios without any coding. Drag-and-drop builder, custom domains, and built-in analytics.',
        stage: 'Idea',
        tags: ['Design', 'Portfolio', 'SaaS'],
        status: StartupStatus.DRAFT,
        members: {
            create: [
                { profileId: students['dave@ashland.edu'].profileId, role: 'founder' },
            ],
        },
    });
    console.log(`🚀 Startup: ArtBoard (DRAFT) — founder: Dave`);

    // Startup 4: NEEDS_CHANGES — founded by Emma
    const secureVault = await upsertStartup('SecureVault', {
        tagline: 'Password manager built for student organizations',
        description:
            'SecureVault provides encrypted credential sharing for student clubs and organizations. Share login credentials for social media accounts, club tools, and resources without exposing plaintext passwords.',
        stage: 'Prototype',
        tags: ['Cybersecurity', 'SaaS', 'Student Orgs'],
        status: StartupStatus.NEEDS_CHANGES,
        adminFeedback: 'Great concept! Please add more details about your encryption approach and how you handle key management. Also clarify your pricing model for student orgs.',
        members: {
            create: [
                { profileId: students['emma@ashland.edu'].profileId, role: 'founder' },
            ],
        },
    });
    console.log(`🚀 Startup: SecureVault (NEEDS_CHANGES) — founder: Emma`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. OPPORTUNITIES (5, various statuses and orgs)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    const opp1 = await prisma.opportunity.create({
        data: {
            orgId: techNova.id,
            title: 'Full-Stack Engineering Intern',
            description:
                'Join our engineering team to build features for our AI-powered SaaS platform. You will work on React, Node.js, and PostgreSQL with experienced engineers.',
            requirements: 'Proficiency in TypeScript and React. Familiarity with REST APIs. Ability to work 15-20 hours/week.',
            budgetType: 'paid',
            budgetRange: '$20-25/hr',
            tags: ['Engineering', 'Full-Stack', 'Internship'],
            status: OpportunityStatus.PUBLISHED,
            publishedAt: new Date(),
        },
    });
    console.log(`💼 Opportunity: "Full-Stack Engineering Intern" at TechNova (PUBLISHED)`);

    const opp2 = await prisma.opportunity.create({
        data: {
            orgId: techNova.id,
            title: 'ML Research Assistant',
            description:
                'Help our data science team fine-tune LLMs for customer support automation. Work with PyTorch, Hugging Face Transformers, and our proprietary datasets.',
            requirements: 'Experience with Python and PyTorch or TensorFlow. Strong understanding of NLP fundamentals.',
            budgetType: 'paid',
            budgetRange: '$22-28/hr',
            tags: ['Machine Learning', 'NLP', 'Research'],
            status: OpportunityStatus.PUBLISHED,
            publishedAt: new Date(),
        },
    });
    console.log(`💼 Opportunity: "ML Research Assistant" at TechNova (PUBLISHED)`);

    const opp3 = await prisma.opportunity.create({
        data: {
            orgId: greenBridge.id,
            title: 'Sustainability Consulting Fellow',
            description:
                'Work with real startup clients to assess and improve their environmental impact. Conduct carbon footprint analyses and recommend green alternatives.',
            requirements: 'Interest in sustainability. Strong analytical and communication skills. Business or Environmental Science background preferred.',
            budgetType: 'unpaid',
            budgetRange: null,
            tags: ['Sustainability', 'Consulting', 'Fellowship'],
            status: OpportunityStatus.PUBLISHED,
            publishedAt: new Date(),
        },
    });
    console.log(`💼 Opportunity: "Sustainability Consulting Fellow" at GreenBridge (PUBLISHED)`);

    const opp4 = await prisma.opportunity.create({
        data: {
            orgId: designCraft.id,
            title: 'UI/UX Design Apprentice',
            description:
                'Shadow our senior designers on real client projects. Learn Figma workflows, design systems, and user research methodologies.',
            requirements: 'Portfolio showcasing design work. Knowledge of Figma. Eye for detail and typography.',
            budgetType: 'equity',
            budgetRange: '1-2% equity in client projects',
            tags: ['Design', 'UI/UX', 'Apprenticeship'],
            status: OpportunityStatus.DRAFT,
        },
    });
    console.log(`💼 Opportunity: "UI/UX Design Apprentice" at DesignCraft (DRAFT)`);

    const opp5 = await prisma.opportunity.create({
        data: {
            orgId: designCraft.id,
            title: 'Brand Identity Project — Summer 2025',
            description:
                'Help design the complete brand identity for a local startup: logo, color palette, typography, and brand guidelines.',
            requirements: 'Strong portfolio in branding/identity design. Adobe Illustrator proficiency.',
            budgetType: 'paid',
            budgetRange: '$1500 flat fee',
            tags: ['Branding', 'Design', 'Freelance'],
            status: OpportunityStatus.CLOSED,
            publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
    });
    console.log(`💼 Opportunity: "Brand Identity Project" at DesignCraft (CLOSED)`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. APPLICATIONS (students applying to opportunities)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    // Alice → Full-Stack Intern (SUBMITTED)
    const app1 = await prisma.application.create({
        data: {
            opportunityId: opp1.id,
            profileId: students['alice@ashland.edu'].profileId,
            coverLetter: 'I have extensive experience with TypeScript, React, and Node.js through my open-source work and personal projects. I would love to contribute to TechNova\'s engineering team.',
            status: ApplicationStatus.SUBMITTED,
            statusHistory: {
                create: {
                    fromStatus: null,
                    toStatus: ApplicationStatus.SUBMITTED,
                    changedBy: students['alice@ashland.edu'].userId,
                },
            },
        },
    });
    console.log(`📋 Application: Alice → "Full-Stack Engineering Intern" (SUBMITTED)`);

    // Carol → ML Research Assistant (SHORTLISTED)
    const app2 = await prisma.application.create({
        data: {
            opportunityId: opp2.id,
            profileId: students['carol@ashland.edu'].profileId,
            coverLetter: 'As a Data Science major with hands-on experience in NLP and PyTorch, I am excited about the opportunity to work on LLM fine-tuning. My sentiment analysis project demonstrates my ability to work with transformer models at scale.',
            status: ApplicationStatus.SHORTLISTED,
            statusHistory: {
                create: [
                    {
                        fromStatus: null,
                        toStatus: ApplicationStatus.SUBMITTED,
                        changedBy: students['carol@ashland.edu'].userId,
                    },
                    {
                        fromStatus: ApplicationStatus.SUBMITTED,
                        toStatus: ApplicationStatus.SHORTLISTED,
                        changedBy: techNovaAdmin.id,
                        note: 'Strong NLP background. Schedule interview.',
                    },
                ],
            },
        },
    });
    console.log(`📋 Application: Carol → "ML Research Assistant" (SHORTLISTED)`);

    // Bob → Sustainability Fellow (SUBMITTED)
    const app3 = await prisma.application.create({
        data: {
            opportunityId: opp3.id,
            profileId: students['bob@ashland.edu'].profileId,
            coverLetter: 'My business background combined with my passion for sustainability makes me a great fit for this fellowship. I have conducted market research for eco-friendly startups as part of my coursework.',
            status: ApplicationStatus.SUBMITTED,
            statusHistory: {
                create: {
                    fromStatus: null,
                    toStatus: ApplicationStatus.SUBMITTED,
                    changedBy: students['bob@ashland.edu'].userId,
                },
            },
        },
    });
    console.log(`📋 Application: Bob → "Sustainability Consulting Fellow" (SUBMITTED)`);

    // Emma → Full-Stack Intern (INTERVIEW)
    const app4 = await prisma.application.create({
        data: {
            opportunityId: opp1.id,
            profileId: students['emma@ashland.edu'].profileId,
            coverLetter: 'While my primary focus is cybersecurity, I have strong full-stack skills in Python, Go, and TypeScript. I would bring a security-first mindset to your engineering team.',
            status: ApplicationStatus.INTERVIEW,
            statusHistory: {
                create: [
                    {
                        fromStatus: null,
                        toStatus: ApplicationStatus.SUBMITTED,
                        changedBy: students['emma@ashland.edu'].userId,
                    },
                    {
                        fromStatus: ApplicationStatus.SUBMITTED,
                        toStatus: ApplicationStatus.SHORTLISTED,
                        changedBy: techNovaAdmin.id,
                        note: 'Interesting security angle. Shortlisting.',
                    },
                    {
                        fromStatus: ApplicationStatus.SHORTLISTED,
                        toStatus: ApplicationStatus.INTERVIEW,
                        changedBy: techNovaAdmin.id,
                        note: 'Technical interview scheduled for Monday.',
                    },
                ],
            },
        },
    });
    console.log(`📋 Application: Emma → "Full-Stack Engineering Intern" (INTERVIEW)`);

    // Dave → Brand Identity (SELECTED — closed opp)
    const app5 = await prisma.application.create({
        data: {
            opportunityId: opp5.id,
            profileId: students['dave@ashland.edu'].profileId,
            coverLetter: 'Branding is my passion. My portfolio includes identity work for three campus organizations and a local coffee shop rebrand.',
            status: ApplicationStatus.SELECTED,
            statusHistory: {
                create: [
                    {
                        fromStatus: null,
                        toStatus: ApplicationStatus.SUBMITTED,
                        changedBy: students['dave@ashland.edu'].userId,
                    },
                    {
                        fromStatus: ApplicationStatus.SUBMITTED,
                        toStatus: ApplicationStatus.SELECTED,
                        changedBy: designCraftAdmin.id,
                        note: 'Outstanding portfolio. Offering the project.',
                    },
                ],
            },
        },
    });
    console.log(`📋 Application: Dave → "Brand Identity Project" (SELECTED)`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. JOIN REQUESTS (students requesting to join startups)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    // Carol wants to join CampusEats (PENDING)
    await prisma.joinRequest.create({
        data: {
            startupId: campusEats.id,
            profileId: students['carol@ashland.edu'].profileId,
            message: 'I would love to help build the data analytics dashboard for CampusEats! I can help you track ordering patterns and optimize delivery routes.',
            status: JoinRequestStatus.PENDING,
        },
    });
    console.log(`🤝 JoinRequest: Carol → CampusEats (PENDING)`);

    // Dave wants to join CampusEats (PENDING)
    await prisma.joinRequest.create({
        data: {
            startupId: campusEats.id,
            profileId: students['dave@ashland.edu'].profileId,
            message: 'Your app could use a design refresh! I would be happy to redesign the UI and create a cohesive brand identity.',
            status: JoinRequestStatus.PENDING,
        },
    });
    console.log(`🤝 JoinRequest: Dave → CampusEats (PENDING)`);

    // Emma wants to join DataLens (PENDING)
    await prisma.joinRequest.create({
        data: {
            startupId: dataLens.id,
            profileId: students['emma@ashland.edu'].profileId,
            message: 'I can help ensure DataLens handles user data securely. I also have experience building Python backends that could help with the data processing pipeline.',
            status: JoinRequestStatus.PENDING,
        },
    });
    console.log(`🤝 JoinRequest: Emma → DataLens (PENDING)`);

    // Alice applied to SecureVault — ACCEPTED
    const acceptedJoinThread = await prisma.messageThread.create({ data: {} });
    await prisma.joinRequest.create({
        data: {
            startupId: secureVault.id,
            profileId: students['alice@ashland.edu'].profileId,
            message: 'I have experience building secure authentication systems and would love to contribute to SecureVault.',
            status: JoinRequestStatus.ACCEPTED,
            threadId: acceptedJoinThread.id,
        },
    });
    // Add Alice as member of SecureVault
    await prisma.startupMember.create({
        data: {
            startupId: secureVault.id,
            profileId: students['alice@ashland.edu'].profileId,
            role: 'member',
        },
    });
    console.log(`🤝 JoinRequest: Alice → SecureVault (ACCEPTED — now a member)`);

    // Bob applied to DataLens — REJECTED
    await prisma.joinRequest.create({
        data: {
            startupId: dataLens.id,
            profileId: students['bob@ashland.edu'].profileId,
            message: 'I can handle the business development side of DataLens — market research, pitch decks, and finding beta testers.',
            status: JoinRequestStatus.REJECTED,
        },
    });
    console.log(`🤝 JoinRequest: Bob → DataLens (REJECTED)`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. MESSAGES (on the accepted join request thread)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('');

    await prisma.message.createMany({
        data: [
            {
                threadId: acceptedJoinThread.id,
                senderId: students['emma@ashland.edu'].userId,
                content: 'Welcome to SecureVault, Alice! Excited to have you on the team.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
                threadId: acceptedJoinThread.id,
                senderId: students['alice@ashland.edu'].userId,
                content: 'Thanks Emma! Happy to be here. I already have some ideas for the encryption layer. Should we set up a meeting this week?',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            },
            {
                threadId: acceptedJoinThread.id,
                senderId: students['emma@ashland.edu'].userId,
                content: 'Definitely! How about Thursday at 3pm in the library study room?',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
            {
                threadId: acceptedJoinThread.id,
                senderId: students['alice@ashland.edu'].userId,
                content: 'Perfect, see you there! I will bring my notes on AES-256 key derivation.',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
            },
        ],
    });
    console.log(`💬 Created 4 messages in the Alice ↔ Emma thread`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    await prisma.notification.createMany({
        data: [
            // Alice — join request accepted
            {
                userId: students['alice@ashland.edu'].userId,
                type: 'join_request_accepted',
                title: 'Join request accepted!',
                message: 'Your request to join SecureVault has been accepted.',
                data: { startupId: secureVault.id, startupName: 'SecureVault' },
            },
            // Alice — new join request for CampusEats (she's founder)
            {
                userId: students['alice@ashland.edu'].userId,
                type: 'join_request_received',
                title: 'New join request',
                message: 'Carol Chen wants to join CampusEats.',
                data: { startupId: campusEats.id, startupName: 'CampusEats' },
            },
            {
                userId: students['alice@ashland.edu'].userId,
                type: 'join_request_received',
                title: 'New join request',
                message: 'Dave Williams wants to join CampusEats.',
                data: { startupId: campusEats.id, startupName: 'CampusEats' },
            },
            // Carol — application shortlisted
            {
                userId: students['carol@ashland.edu'].userId,
                type: 'application_status_changed',
                title: 'Application shortlisted!',
                message: 'Your application for "ML Research Assistant" at TechNova has been shortlisted.',
                data: { applicationId: app2.id, opportunityTitle: 'ML Research Assistant' },
            },
            // Emma — new join request for DataLens
            {
                userId: students['carol@ashland.edu'].userId,
                type: 'join_request_received',
                title: 'New join request',
                message: 'Emma Taylor wants to join DataLens.',
                data: { startupId: dataLens.id, startupName: 'DataLens' },
            },
            // Emma — application moved to interview
            {
                userId: students['emma@ashland.edu'].userId,
                type: 'application_status_changed',
                title: 'Interview scheduled!',
                message: 'Your application for "Full-Stack Engineering Intern" at TechNova has moved to the Interview stage.',
                data: { applicationId: app4.id, opportunityTitle: 'Full-Stack Engineering Intern' },
            },
            // Dave — application selected
            {
                userId: students['dave@ashland.edu'].userId,
                type: 'application_status_changed',
                title: 'Congratulations! You were selected!',
                message: 'Your application for "Brand Identity Project — Summer 2025" at DesignCraft has been accepted!',
                data: { applicationId: app5.id, opportunityTitle: 'Brand Identity Project — Summer 2025' },
            },
            // Emma — startup needs changes
            {
                userId: students['emma@ashland.edu'].userId,
                type: 'startup_needs_changes',
                title: 'Startup review feedback',
                message: 'SecureVault needs some changes before it can be approved. Check the admin feedback.',
                data: { startupId: secureVault.id, startupName: 'SecureVault' },
            },
            // Admin — new startup submitted
            {
                userId: admin.id,
                type: 'startup_submitted',
                title: 'New startup submitted for review',
                message: 'DataLens has been submitted for review by Carol Chen.',
                data: { startupId: dataLens.id, startupName: 'DataLens' },
            },
        ],
    });
    console.log(`🔔 Created 9 notifications across multiple users`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. AUDIT LOGS (admin actions)
    // ═══════════════════════════════════════════════════════════════════════════

    await prisma.auditLog.createMany({
        data: [
            {
                userId: admin.id,
                action: 'startup_approved',
                targetType: 'startup',
                targetId: campusEats.id,
                details: { startupName: 'CampusEats', reason: 'Strong MVP with active user base.' },
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            {
                userId: admin.id,
                action: 'startup_needs_changes',
                targetType: 'startup',
                targetId: secureVault.id,
                details: { startupName: 'SecureVault', feedback: 'Needs more details on encryption approach.' },
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
        ],
    });
    console.log(`📝 Created 2 audit log entries`);

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    SEED COMPLETE ✅                          ║
╠══════════════════════════════════════════════════════════════╣
║  All passwords: Test1234!                                    ║
╠══════════════════════════════════════════════════════════════╣
║  ADMIN            admin@ashland.edu                          ║
║  ─────────────────────────────────────────────────────────── ║
║  STUDENTS         alice@ashland.edu   (founder: CampusEats)  ║
║                   bob@ashland.edu     (member: CampusEats)   ║
║                   carol@ashland.edu   (founder: DataLens)    ║
║                   dave@ashland.edu    (founder: ArtBoard)    ║
║                   emma@ashland.edu    (founder: SecureVault) ║
║  ─────────────────────────────────────────────────────────── ║
║  COMPANIES        ceo@technova.io        (TechNova)          ║
║                   hr@technova.io         (TechNova member)   ║
║                   founder@greenbridge.co (GreenBridge)        ║
║                   lead@designcraft.studio (DesignCraft)       ║
╚══════════════════════════════════════════════════════════════╝
`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
