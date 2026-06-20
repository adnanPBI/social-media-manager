import { PrismaClient, Platform } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedPosts = [
  {
    id: 'demo-content-001',
    title: '9/10 Gas Pricing: A Massive Failure',
    body: 'Dozens of videos explain the history of 9/10-cent gas pricing, but almost none offer a practical path to remove it. Cancel910gas is building a subscriber-driven movement to pressure big oil to drop the fraction for good.',
  },
  {
    id: 'demo-content-002',
    title: 'The Fraction Nobody Asked For',
    body: 'A tiny 9/10-cent fraction appears on fuel prices everywhere, yet consumers rarely get a direct say in whether it should stay. Cancel910gas is organizing subscribers around one clear ask: drop the fraction for good.',
  },
  {
    id: 'demo-content-003',
    title: 'From Awareness to Action',
    body: 'Explaining the 9/10-cent pricing trick is not enough. The next step is public pressure, subscriber growth, and a simple message big oil cannot ignore: cancel the fraction.',
  },
  {
    id: 'demo-content-004',
    title: 'Subscriber Goal: 3 Million',
    body: 'The Cancel910gas campaign is aiming for 3 million YouTube subscribers so the message becomes too visible to dismiss. Subscribe, share, and help move the campaign from complaint to leverage.',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      name: 'Cancel910gas Campaign',
      ownerId: user.id,
    },
  });

  for (const platform of [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.TIKTOK]) {
    await prisma.socialAccount.upsert({
      where: { id: `demo-${platform.toLowerCase()}-account` },
      update: {
        lastQuotaMax: platform === Platform.INSTAGRAM || platform === Platform.TIKTOK ? 20 : 50,
      },
      create: {
        id: `demo-${platform.toLowerCase()}-account`,
        workspaceId: workspace.id,
        platform,
        accountName: `${platform === Platform.TWITTER ? 'X / Twitter' : platform} Demo Account`,
        platformAccountId: `mock-${platform.toLowerCase()}-001`,
        avatarUrl: null,
        accessTokenEncrypted: `mock-token-${platform.toLowerCase()}`,
        refreshTokenEncrypted: `mock-refresh-${platform.toLowerCase()}`,
        scopes: ['mock.publish', 'mock.analytics', 'mock.insights'],
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        lastQuotaMax: platform === Platform.INSTAGRAM || platform === Platform.TIKTOK ? 20 : 50,
      },
    });
  }

  for (const post of seedPosts) {
    await prisma.contentItem.upsert({
      where: { id: post.id },
      update: {},
      create: {
        id: post.id,
        workspaceId: workspace.id,
        cmsContentId: `cancel910gas-${post.id}`,
        title: post.title,
        body: post.body,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        mediaAssets: [],
        hashtags: ['Cancel910gas', 'GasPricing', 'ConsumerAdvocacy'],
        linkUrl: 'https://youtube.com/@cancel910gas',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'seed.hybrid_demo_workspace',
      metadata: { posts: seedPosts.length, platforms: 4 },
    },
  });

  console.log('Seed completed. Login: admin@example.com / Admin@12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
