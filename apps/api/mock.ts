import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findUnique({
    where: { id: 'demo-workspace' }
  });
  
  if (!workspace) {
    console.error("Workspace not found, run seed first.");
    return;
  }

  const contentItems = await prisma.contentItem.findMany({
    where: { workspaceId: workspace.id }
  });

  const socialAccounts = await prisma.socialAccount.findMany({
    where: { workspaceId: workspace.id }
  });

  if (contentItems.length === 0 || socialAccounts.length === 0) {
    console.error("Content items or social accounts missing.");
    return;
  }

  // Create Scheduled Posts & Platform Variants
  for (let i = 0; i < contentItems.length; i++) {
    const content = contentItems[i];
    
    // Create a scheduled post for 1 day ago to 3 days ago
    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() - (i + 1));

    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        workspaceId: workspace.id,
        contentItemId: content.id,
        scheduledTime,
        status: 'PUBLISHED',
      }
    });

    for (const account of socialAccounts) {
      // Platform Post Variant
      const variant = await prisma.platformPostVariant.create({
        data: {
          scheduledPostId: scheduledPost.id,
          platform: account.platform,
          socialAccountId: account.id,
          caption: content.body,
          publishStatus: 'PUBLISHED',
          jobStatus: 'COMPLETED',
          publishedAt: scheduledTime,
        }
      });

      // Analytics Snapshot for the variant
      const reach = Math.floor(Math.random() * 5000) + 500;
      const impressions = reach + Math.floor(Math.random() * 2000);
      const engagement = Math.floor(reach * 0.1);
      
      await prisma.analyticsSnapshot.create({
        data: {
          platformPostVariantId: variant.id,
          platform: account.platform,
          reach,
          impressions,
          engagement,
          likes: Math.floor(engagement * 0.6),
          comments: Math.floor(engagement * 0.2),
          shares: Math.floor(engagement * 0.1),
          saves: Math.floor(engagement * 0.1),
          clicks: Math.floor(engagement * 0.5),
          followerCount: Math.floor(Math.random() * 10000) + 1000,
          engagementRate: 0.1,
          collectedAt: new Date(),
        }
      });
    }
  }

  // Follower Snapshots (7 days back)
  for (const account of socialAccounts) {
    let currentFollowers = 5000 + Math.floor(Math.random() * 5000);
    for (let day = 7; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      
      await prisma.followerSnapshot.create({
        data: {
          socialAccountId: account.id,
          platform: account.platform,
          followerCount: currentFollowers,
          collectedAt: date,
        }
      });
      currentFollowers += Math.floor(Math.random() * 100);
    }
  }

  console.log("Mock analytics & queue data inserted!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
