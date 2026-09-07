-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "hashedPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "size" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "services" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "design" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipientFilter" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "projectId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stages" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "leadId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "crawlFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "lastCrawlAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoCrawl" (
    "id" TEXT NOT NULL,
    "seoProjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoCrawl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "seoProjectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1Count" INTEGER NOT NULL DEFAULT 0,
    "h2Count" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "loadTime" DOUBLE PRECISION,
    "mobileFriendly" BOOLEAN NOT NULL DEFAULT false,
    "hasSchema" BOOLEAN NOT NULL DEFAULT false,
    "hasSitemap" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoIssue" (
    "id" TEXT NOT NULL,
    "seoProjectId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoKeyword" (
    "id" TEXT NOT NULL,
    "seoProjectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "position" INTEGER,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DOUBLE PRECISION,
    "trend" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoBacklink" (
    "id" TEXT NOT NULL,
    "seoProjectId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "domainAuthority" INTEGER,
    "pageAuthority" INTEGER,
    "linkType" TEXT NOT NULL DEFAULT 'dofollow',
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoBacklink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'blog',
    "keywords" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "aiScore" INTEGER,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'blog',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "seoScore" INTEGER,
    "tenantId" TEXT NOT NULL,
    "ideaId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCalendar" (
    "id" TEXT NOT NULL,
    "contentPieceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "followerCount" INTEGER,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isConnect" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetType" TEXT NOT NULL DEFAULT 'daily',
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "properties" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "data" TEXT,
    "schedule" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTask" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionData" TEXT,
    "impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "triggerConfig" TEXT,
    "steps" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkOpportunity" (
    "id" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "targetUrl" TEXT NOT NULL,
    "domainAuthority" INTEGER,
    "pageAuthority" INTEGER,
    "relevanceScore" INTEGER,
    "linkType" TEXT NOT NULL DEFAULT 'dofollow',
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "contactEmail" TEXT,
    "contactName" TEXT,
    "outreachTemplate" TEXT,
    "outreachSentAt" TIMESTAMP(3),
    "responseReceivedAt" TIMESTAMP(3),
    "acquiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklinkOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkOutreach" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklinkOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityTracker" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "domainAuthority" INTEGER NOT NULL DEFAULT 0,
    "pageAuthority" INTEGER NOT NULL DEFAULT 0,
    "backlinksCount" INTEGER NOT NULL DEFAULT 0,
    "referringDomains" INTEGER NOT NULL DEFAULT 0,
    "trustFlow" INTEGER,
    "citationFlow" INTEGER,
    "spamScore" INTEGER NOT NULL DEFAULT 0,
    "history" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAnalysis" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "followerCount" INTEGER,
    "followingCount" INTEGER,
    "postCount" INTEGER,
    "avgLikes" DOUBLE PRECISION,
    "avgComments" DOUBLE PRECISION,
    "avgShares" DOUBLE PRECISION,
    "engagementRate" DOUBLE PRECISION,
    "followerGrowth" DOUBLE PRECISION,
    "postingFrequency" DOUBLE PRECISION,
    "topHashtags" TEXT,
    "bestPostingTime" TEXT,
    "contentCategories" TEXT,
    "influenceScore" INTEGER,
    "authenticityScore" INTEGER,
    "brandFitScore" INTEGER,
    "competitorRank" INTEGER,
    "marketShare" DOUBLE PRECISION,
    "rawData" TEXT,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "description" TEXT,
    "foundedYear" INTEGER,
    "employees" TEXT,
    "revenue" TEXT,
    "websiteTraffic" INTEGER,
    "trafficTrend" DOUBLE PRECISION,
    "organicKeywords" INTEGER,
    "paidKeywords" INTEGER,
    "backlinks" INTEGER,
    "domainAuthority" INTEGER,
    "socialFollowers" TEXT,
    "socialEngagement" DOUBLE PRECISION,
    "marketingSpend" TEXT,
    "adChannels" TEXT,
    "contentOutput" TEXT,
    "seoScore" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "opportunities" TEXT,
    "threats" TEXT,
    "marketPosition" TEXT,
    "marketShare" DOUBLE PRECISION,
    "growthRate" DOUBLE PRECISION,
    "threat" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportMarket" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "region" TEXT,
    "marketSize" DOUBLE PRECISION,
    "growthRate" DOUBLE PRECISION,
    "importVolume" DOUBLE PRECISION,
    "importTrend" DOUBLE PRECISION,
    "tariffRate" DOUBLE PRECISION,
    "importDuty" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "tradeBarriers" TEXT,
    "regulations" TEXT,
    "opportunityScore" INTEGER,
    "competitionLevel" TEXT,
    "marketEntryDifficulty" TEXT,
    "recommendedStrategy" TEXT,
    "population" INTEGER,
    "gdpPerCapita" DOUBLE PRECISION,
    "internetPenetration" DOUBLE PRECISION,
    "keyCities" TEXT,
    "mainPorts" TEXT,
    "language" TEXT,
    "currency" TEXT,
    "paymentMethods" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hsCode" TEXT,
    "category" TEXT,
    "description" TEXT,
    "globalMarketSize" DOUBLE PRECISION,
    "globalGrowthRate" DOUBLE PRECISION,
    "topExporters" TEXT,
    "topImporters" TEXT,
    "avgPrice" DOUBLE PRECISION,
    "priceTrend" DOUBLE PRECISION,
    "priceVolatility" DOUBLE PRECISION,
    "competitionLevel" TEXT,
    "barriers" TEXT,
    "certifications" TEXT,
    "targetMarkets" TEXT,
    "opportunityScore" INTEGER,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketResearch" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT,
    "product" TEXT,
    "summary" TEXT NOT NULL,
    "keyFindings" TEXT,
    "recommendations" TEXT,
    "dataSources" TEXT,
    "marketSize" DOUBLE PRECISION,
    "growthRate" DOUBLE PRECISION,
    "competitionLevel" TEXT,
    "aiAnalysis" TEXT,
    "confidenceScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "templateName" TEXT,
    "campaignId" TEXT,
    "leadId" TEXT,
    "tenantId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT NOT NULL DEFAULT 'marketing',
    "body" TEXT NOT NULL,
    "header" TEXT,
    "footer" TEXT,
    "buttons" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "templateId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "leadId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewMonitor" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "placeId" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastChecked" TIMESTAMP(3),
    "autoRespond" BOOLEAN NOT NULL DEFAULT false,
    "responseTemplate" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "sentimentBreakdown" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewMonitorId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "sentiment" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbTestExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "controlName" TEXT NOT NULL DEFAULT 'Control',
    "controlData" TEXT NOT NULL,
    "variantName" TEXT NOT NULL DEFAULT 'Variant A',
    "variantData" TEXT NOT NULL,
    "trafficSplit" INTEGER NOT NULL DEFAULT 50,
    "controlVisitors" INTEGER NOT NULL DEFAULT 0,
    "variantVisitors" INTEGER NOT NULL DEFAULT 0,
    "controlConversions" INTEGER NOT NULL DEFAULT 0,
    "variantConversions" INTEGER NOT NULL DEFAULT 0,
    "controlConversionRate" DOUBLE PRECISION,
    "variantConversionRate" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION,
    "winner" TEXT,
    "targetUrl" TEXT,
    "targetMetric" TEXT NOT NULL DEFAULT 'conversion',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbTestExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "experimentId" TEXT,
    "tenantId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "executiveSummary" TEXT NOT NULL,
    "achievements" TEXT,
    "challenges" TEXT,
    "metrics" TEXT,
    "recommendations" TEXT,
    "nextMonthPlan" TEXT,
    "aiAnalysis" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentTo" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDiagnostic" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "marketingScore" INTEGER,
    "salesScore" INTEGER,
    "digitalPresenceScore" INTEGER,
    "customerSatisfactionScore" INTEGER,
    "operationalScore" INTEGER,
    "overallScore" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "opportunities" TEXT,
    "threats" TEXT,
    "detectedIssues" TEXT,
    "detectedOpportunities" TEXT,
    "aiAnalysis" TEXT,
    "summary" TEXT,
    "actionPlan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotWidget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "domain" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#10b981',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    "placeholder" TEXT NOT NULL DEFAULT 'Type your message...',
    "systemPrompt" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "captureName" BOOLEAN NOT NULL DEFAULT true,
    "captureEmail" BOOLEAN NOT NULL DEFAULT true,
    "capturePhone" BOOLEAN NOT NULL DEFAULT false,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "leadsCaptured" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCycle" (
    "id" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL DEFAULT 'weekly',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "phase1Result" TEXT,
    "phase2Result" TEXT,
    "phase3Result" TEXT,
    "phase4Result" TEXT,
    "phase5Result" TEXT,
    "phase6Result" TEXT,
    "phase7Result" TEXT,
    "phase8Result" TEXT,
    "phase9Result" TEXT,
    "summary" TEXT,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "recommendationsGenerated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "maxLeads" INTEGER NOT NULL DEFAULT 100,
    "maxCampaigns" INTEGER NOT NULL DEFAULT 5,
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "maxSeoProjects" INTEGER NOT NULL DEFAULT 1,
    "maxSocialAccounts" INTEGER NOT NULL DEFAULT 3,
    "maxWorkflows" INTEGER NOT NULL DEFAULT 2,
    "aiCredits" INTEGER NOT NULL DEFAULT 100,
    "leadsUsed" INTEGER NOT NULL DEFAULT 0,
    "campaignsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lineItems" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "linkedPhases" TEXT,
    "projectedValue" DOUBLE PRECISION,
    "projectedDate" TIMESTAMP(3),
    "history" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "metadata" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemData" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMention" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "snippet" TEXT NOT NULL,
    "author" TEXT,
    "sentiment" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "reach" INTEGER,
    "engagement" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "mentionedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertOnPositive" BOOLEAN NOT NULL DEFAULT false,
    "alertOnNegative" BOOLEAN NOT NULL DEFAULT true,
    "alertOnNeutral" BOOLEAN NOT NULL DEFAULT false,
    "totalMentions" INTEGER NOT NULL DEFAULT 0,
    "lastChecked" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculation" (
    "id" TEXT NOT NULL,
    "monthlyBudget" DOUBLE PRECISION NOT NULL,
    "productPrice" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "reviewPlatforms" INTEGER NOT NULL,
    "funnelLeads" INTEGER NOT NULL,
    "funnelQualified" DOUBLE PRECISION NOT NULL,
    "funnelDeals" DOUBLE PRECISION NOT NULL,
    "recommendedPlan" TEXT,
    "estimatedMonthlyCost" DOUBLE PRECISION,
    "estimatedROI" DOUBLE PRECISION,
    "estimatedLeadsPerMonth" INTEGER,
    "estimatedRevenuePerMonth" DOUBLE PRECISION,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressiveUnlock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unlockedPhases" TEXT NOT NULL DEFAULT '[]',
    "currentPhase" TEXT NOT NULL DEFAULT 'P1',
    "phaseProgress" INTEGER NOT NULL DEFAULT 0,
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockHistory" TEXT,
    "milestones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressiveUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "htmlContent" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Marketing',
    "tags" TEXT,
    "coverImage" TEXT,
    "author" TEXT NOT NULL DEFAULT 'Expload Team',
    "authorAvatar" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER NOT NULL DEFAULT 5,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "currentView" TEXT NOT NULL DEFAULT 'dashboard',
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerCall" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "pricePerMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyLimit" INTEGER NOT NULL DEFAULT 10000,
    "category" TEXT NOT NULL DEFAULT 'marketing',
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "docContent" TEXT,
    "codeExamples" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productIds" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "customRateLimit" INTEGER,
    "customDailyLimit" INTEGER,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "minSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minMonths" INTEGER NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeAdCredits" INTEGER NOT NULL DEFAULT 0,
    "apiCallBonus" INTEGER NOT NULL DEFAULT 0,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "earlyAccess" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#B0BEC5',
    "icon" TEXT NOT NULL DEFAULT '🥉',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthsActive" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTierUp" TIMESTAMP(3),
    "adCreditsBalance" INTEGER NOT NULL DEFAULT 0,
    "adCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubPoint" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubReward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minTierLevel" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAdvertisement" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "targetUrl" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'dashboard_sidebar',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubAdvertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcommerceProduct" (
    "id" TEXT NOT NULL,
    "asin" TEXT,
    "productId" TEXT,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "originalPrice" DOUBLE PRECISION,
    "costEstimate" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "salesPerMonth" INTEGER,
    "revenuePerMonth" DOUBLE PRECISION,
    "bsrRank" INTEGER,
    "fbaFee" DOUBLE PRECISION,
    "referralFee" DOUBLE PRECISION,
    "totalFees" DOUBLE PRECISION,
    "estimatedProfit" DOUBLE PRECISION,
    "estimatedMargin" DOUBLE PRECISION,
    "estimatedROI" DOUBLE PRECISION,
    "competitionLevel" TEXT,
    "sellerCount" INTEGER,
    "trendDirection" TEXT,
    "trendScore" INTEGER,
    "category" TEXT,
    "brand" TEXT,
    "keywords" TEXT,
    "aiAnalysis" TEXT,
    "lastChecked" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcommerceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerOpportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "initialInvestment" DOUBLE PRECISION NOT NULL,
    "monthlyCostMin" DOUBLE PRECISION NOT NULL,
    "monthlyCostMax" DOUBLE PRECISION NOT NULL,
    "monthlyRevenueMin" DOUBLE PRECISION NOT NULL,
    "monthlyRevenueMax" DOUBLE PRECISION NOT NULL,
    "monthlyProfitMin" DOUBLE PRECISION NOT NULL,
    "monthlyProfitMax" DOUBLE PRECISION NOT NULL,
    "setupTimeDays" INTEGER NOT NULL,
    "timeToProfitDays" INTEGER NOT NULL,
    "breakEvenMonths" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskFactors" TEXT,
    "requirements" TEXT,
    "skills" TEXT,
    "region" TEXT,
    "benefits" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL DEFAULT '📦',
    "color" TEXT NOT NULL DEFAULT '#0A2A3A',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerApplication" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "businessName" TEXT,
    "plannedInvestment" DOUBLE PRECISION,
    "plannedTimeline" TEXT,
    "experience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "agreedTerms" BOOLEAN NOT NULL DEFAULT false,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitEstimate" (
    "id" TEXT NOT NULL,
    "productPrice" DOUBLE PRECISION NOT NULL,
    "productCost" DOUBLE PRECISION NOT NULL,
    "platform" TEXT NOT NULL,
    "monthlyVolume" INTEGER NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "fbaFee" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "advertisingCost" DOUBLE PRECISION NOT NULL,
    "otherCosts" DOUBLE PRECISION NOT NULL,
    "profitPerUnit" DOUBLE PRECISION NOT NULL,
    "monthlyProfit" DOUBLE PRECISION NOT NULL,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "breakEvenUnits" INTEGER NOT NULL,
    "breakEvenMonths" DOUBLE PRECISION NOT NULL,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "adGroup" TEXT,
    "keyword" TEXT,
    "clickId" TEXT,
    "clickTimestamp" TIMESTAMP(3),
    "installTimestamp" TIMESTAMP(3),
    "eventName" TEXT NOT NULL DEFAULT 'install',
    "eventValue" DOUBLE PRECISION,
    "isFraud" BOOLEAN NOT NULL DEFAULT false,
    "fraudReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "revenue" DOUBLE PRECISION,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "action" TEXT NOT NULL DEFAULT 'flag',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalDetected" INTEGER NOT NULL DEFAULT 0,
    "totalBlocked" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cohortDate" TIMESTAMP(3) NOT NULL,
    "cohortSize" INTEGER NOT NULL DEFAULT 0,
    "retentionData" TEXT,
    "revenueData" TEXT,
    "segment" TEXT,
    "segmentValue" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingFunnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stages" TEXT NOT NULL,
    "results" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "segment" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerJourney" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "triggerConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalEnrolled" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalConverted" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "segment" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "platform" TEXT NOT NULL DEFAULT 'both',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'kavenegar',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "campaignId" TEXT,
    "leadId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "secretToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "lastResponseStatus" INTEGER,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'tenant',
    "color" TEXT NOT NULL DEFAULT '#0A2A3A',
    "icon" TEXT NOT NULL DEFAULT '👤',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT,
    "customPermissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changes" TEXT,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteLabelConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "labelType" TEXT NOT NULL DEFAULT 'grey',
    "brandName" TEXT NOT NULL,
    "brandLogoUrl" TEXT,
    "brandFaviconUrl" TEXT,
    "brandColors" TEXT,
    "customDomain" TEXT,
    "customSubdomain" TEXT,
    "supportEmail" TEXT,
    "fromEmail" TEXT,
    "hideExploadBranding" BOOLEAN NOT NULL DEFAULT false,
    "hideBlogSection" BOOLEAN NOT NULL DEFAULT false,
    "hidePricingCalc" BOOLEAN NOT NULL DEFAULT false,
    "customFooterText" TEXT,
    "isReseller" BOOLEAN NOT NULL DEFAULT false,
    "resellerTier" TEXT NOT NULL DEFAULT 'standard',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "customPricing" TEXT,
    "maxSubTenants" INTEGER NOT NULL DEFAULT 10,
    "maxStorage" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteLabelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerCustomer" (
    "id" TEXT NOT NULL,
    "resellerTenantId" TEXT NOT NULL,
    "customerTenantId" TEXT NOT NULL,
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 49,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "commissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "churnedAt" TIMESTAMP(3),
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "resellerTenantId" TEXT NOT NULL,
    "customerTenantId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "invoiceId" TEXT,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT,
    "paymentMethodId" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "processingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resellerTenantId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "brand" TEXT,
    "last4" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "holderName" TEXT,
    "stripePaymentMethodId" TEXT,
    "stripeCustomerId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "thresholdValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "isPlatformAlert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPromotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "targetAudience" TEXT,
    "targetSegments" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "referrerReward" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "refereeReward" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rewardType" TEXT NOT NULL DEFAULT 'credit',
    "minSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxReferrals" INTEGER,
    "expiresAfterDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalRewardsPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "referrerTenantId" TEXT NOT NULL,
    "refereeEmail" TEXT NOT NULL,
    "refereeTenantId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referrerRewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "refereeRewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedUpAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoLink" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "shortUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "qrCodeUrl" TEXT,
    "qrCodeColor" TEXT NOT NULL DEFAULT '#0A2A3A',
    "qrCodeSize" INTEGER NOT NULL DEFAULT 300,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "clickData" TEXT,
    "variantLabel" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoLinkClick" (
    "id" TEXT NOT NULL,
    "promoLinkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionValue" DOUBLE PRECISION,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "contentType" TEXT,
    "contentFormats" TEXT,
    "topicDiversity" TEXT,
    "topTopics" TEXT,
    "titleKeywords" TEXT,
    "descriptionStyle" TEXT,
    "postsPerWeek" DOUBLE PRECISION,
    "postsPerMonth" INTEGER,
    "uploadSchedule" TEXT,
    "consistencyScore" INTEGER,
    "avgLikes" INTEGER,
    "avgComments" INTEGER,
    "avgShares" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "commentResponseRate" DOUBLE PRECISION,
    "avgResponseTime" TEXT,
    "avgViews" INTEGER,
    "peakViews" INTEGER,
    "subscriberGrowth" DOUBLE PRECISION,
    "avgWatchTime" TEXT,
    "ctr" DOUBLE PRECISION,
    "totalSubscribers" INTEGER,
    "seoKeywords" TEXT,
    "tagStrategy" TEXT,
    "descriptionOptimized" BOOLEAN,
    "usesEndCards" BOOLEAN,
    "usesPlaylists" BOOLEAN,
    "internalLinking" TEXT,
    "thumbnailStyle" TEXT,
    "visualConsistency" INTEGER,
    "colorScheme" TEXT,
    "usesBranding" BOOLEAN,
    "audienceAgeRange" TEXT,
    "audienceGender" TEXT,
    "audienceCountries" TEXT,
    "toneOfVoice" TEXT,
    "languageUsed" TEXT,
    "hasSponsorships" BOOLEAN NOT NULL DEFAULT false,
    "sponsorBrands" TEXT,
    "hasAffiliateLinks" BOOLEAN NOT NULL DEFAULT false,
    "affiliatePrograms" TEXT,
    "monetizationMethods" TEXT,
    "estimatedMonthlyEarnings" DOUBLE PRECISION,
    "platforms" TEXT,
    "crossPlatformStrategy" TEXT,
    "totalFollowersAll" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "uniqueSellingPoints" TEXT,
    "improvementOpportunities" TEXT,
    "aiAnalysis" TEXT,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "linkedin" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "investorType" TEXT NOT NULL,
    "firmName" TEXT,
    "stages" TEXT,
    "sectors" TEXT,
    "checkSize" TEXT,
    "geography" TEXT,
    "ticketSize" DOUBLE PRECISION,
    "portfolioCompanies" TEXT,
    "portfolioCount" INTEGER NOT NULL DEFAULT 0,
    "totalInvested" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "matchScore" INTEGER,
    "matchReasons" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactStatus" TEXT NOT NULL DEFAULT 'not_contacted',
    "lastContactAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CofounderProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "linkedin" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "currentRole" TEXT,
    "currentCompany" TEXT,
    "experience" INTEGER,
    "skills" TEXT,
    "industries" TEXT,
    "lookingFor" TEXT,
    "commitment" TEXT NOT NULL DEFAULT 'full-time',
    "equityExpected" DOUBLE PRECISION,
    "availableFrom" TIMESTAMP(3),
    "relocationOk" BOOLEAN NOT NULL DEFAULT false,
    "remoteOk" BOOLEAN NOT NULL DEFAULT true,
    "matchScore" INTEGER,
    "matchReasons" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactStatus" TEXT NOT NULL DEFAULT 'not_contacted',
    "lastContactAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CofounderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipOpportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "partnerWebsite" TEXT,
    "partnerContact" TEXT,
    "valueProposition" TEXT,
    "expectedBenefit" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "timeline" TEXT,
    "requirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "matchScore" INTEGER,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "registrationNumber" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "swiftCode" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "contractId" TEXT,
    "totalLicensesPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalLicensesAllocated" INTEGER NOT NULL DEFAULT 0,
    "totalLicensesUsed" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaidToPlatform" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorContract" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "minimumGuarantee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumGuaranteePeriod" TEXT NOT NULL DEFAULT 'annual',
    "wholesaleDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "revSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTerms" TEXT NOT NULL DEFAULT 'prepaid',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "territoryScope" TEXT,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "signedByDistributor" TEXT,
    "signedByPlatform" TEXT,
    "signedAtDistributor" TIMESTAMP(3),
    "signedAtPlatform" TIMESTAMP(3),
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalTermMonths" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicensePackage" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "licenseCount" INTEGER NOT NULL,
    "wholesalePrice" DOUBLE PRECISION NOT NULL,
    "retailPriceSuggestion" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "planTier" TEXT NOT NULL DEFAULT 'pro',
    "validityMonths" INTEGER NOT NULL DEFAULT 12,
    "features" TEXT,
    "tierRestriction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicensePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAllocation" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "customerTenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_pool',
    "issuedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "salePrice" DOUBLE PRECISION,
    "saleCurrency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryExclusivity" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "isExclusive" BOOLEAN NOT NULL DEFAULT true,
    "exclusivityLevel" TEXT NOT NULL DEFAULT 'country',
    "minimumSalesCommitment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commitmentPeriod" TEXT NOT NULL DEFAULT 'annual',
    "achievedSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerritoryExclusivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorPayout" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossSales" DOUBLE PRECISION NOT NULL,
    "platformShare" DOUBLE PRECISION NOT NULL,
    "distributorShare" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "lineItems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorSupportTicket" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "tier" TEXT NOT NULL DEFAULT 'tier3',
    "escalatedByDistributor" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "assignedToId" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorAuditLog" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "changes" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributorAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "distributorId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "fiatCurrency" TEXT NOT NULL DEFAULT 'USD',
    "cryptoAmount" DOUBLE PRECISION,
    "cryptoCurrency" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'nowpayments',
    "gatewayPaymentId" TEXT,
    "gatewayInvoiceUrl" TEXT,
    "payToAddress" TEXT,
    "refundAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "requiredConfirmations" INTEGER NOT NULL DEFAULT 3,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "exchangeRate" DOUBLE PRECISION,
    "feeAmount" DOUBLE PRECISION,
    "netAmount" DOUBLE PRECISION,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoWallet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "label" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isPlatformWallet" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT,
    "secretKey" TEXT,
    "webhookSecret" TEXT,
    "merchantId" TEXT,
    "supportedCurrencies" TEXT,
    "supportedMethods" TEXT,
    "supportedCountries" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "routeBy" TEXT NOT NULL DEFAULT 'currency',
    "routeRules" TEXT,
    "fees" TEXT,
    "settlementTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "headEmployeeId" TEXT,
    "accessScope" TEXT NOT NULL DEFAULT 'limited',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "budget" DOUBLE PRECISION,
    "costCenter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalEmployee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "employeeRole" TEXT NOT NULL DEFAULT 'staff',
    "platformRole" TEXT NOT NULL DEFAULT 'employee',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "jobTitle" TEXT,
    "employeeId" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full_time',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "managerId" TEXT,
    "assignedDistributorIds" TEXT,
    "assignedRegion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "salary" DOUBLE PRECISION,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "bonusEligible" BOOLEAN NOT NULL DEFAULT false,
    "workPhone" TEXT,
    "workEmail" TEXT,
    "location" TEXT,
    "avatar" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalEmployeeActivity" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalEmployeeActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "breakdown" TEXT,
    "generatedById" TEXT,
    "generatedByName" TEXT,
    "generationMethod" TEXT NOT NULL DEFAULT 'auto',
    "sharedWithDistributor" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "fileUrl" TEXT,
    "fileFormat" TEXT NOT NULL DEFAULT 'pdf',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiBaseUrl" TEXT NOT NULL,
    "models" TEXT,
    "isFreeTier" BOOLEAN NOT NULL DEFAULT true,
    "dailyTokenLimit" INTEGER NOT NULL DEFAULT 1000000,
    "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 10000000,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
    "lastFailedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmUsageRecord" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestType" TEXT NOT NULL,
    "tenantId" TEXT,
    "sessionType" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llmProviderConfigId" TEXT,

    CONSTRAINT "LlmUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmAuditEvent" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fromProvider" TEXT,
    "toProvider" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llmProviderConfigId" TEXT,

    CONSTRAINT "LlmAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "businessName" TEXT,
    "businessWebsite" TEXT,
    "industry" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 6,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "answers" TEXT,
    "customSystemPrompt" TEXT,
    "extractedContext" TEXT,
    "crawlStatus" TEXT NOT NULL DEFAULT 'pending',
    "crawlError" TEXT,
    "docsProcessed" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "aiNeedsAnalysis" TEXT,
    "negotiationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "extractedText" TEXT,
    "textLength" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "onboardingId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "projectName" TEXT NOT NULL,
    "projectDescription" TEXT NOT NULL,
    "currentState" TEXT NOT NULL DEFAULT 'initial',
    "proposalRound" INTEGER NOT NULL DEFAULT 0,
    "contextSummary" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "customerBudget" DOUBLE PRECISION,
    "customerBudgetCurrency" TEXT NOT NULL DEFAULT 'USD',
    "customerTimeline" TEXT,
    "customerPriorities" TEXT,
    "acceptedProposalId" TEXT,
    "rejectionReasons" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationProposal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT,
    "excludedFeatures" TEXT,
    "deliveryWeeks" INTEGER NOT NULL,
    "deliveryMilestone" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentSchedule" TEXT,
    "savingsPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryReductionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scopeReductionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "llmProvider" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "rationale" TEXT,
    "customerResponse" TEXT,
    "customerFeedback" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationAuditEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "round" INTEGER,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegotiationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualAssistant" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "skills" TEXT NOT NULL,
    "primarySkill" TEXT NOT NULL,
    "languages" TEXT,
    "workMode" TEXT NOT NULL DEFAULT 'remote',
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "monthlyRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxConcurrentProjects" INTEGER NOT NULL DEFAULT 3,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "deliverables" TEXT,
    "pricingType" TEXT NOT NULL,
    "fixedPrice" DOUBLE PRECISION,
    "hourlyEstimate" DOUBLE PRECISION,
    "monthlyHours" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedDays" INTEGER NOT NULL,
    "requiredSkills" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantAssignment" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "serviceId" TEXT,
    "tenantId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectDescription" TEXT NOT NULL,
    "pricingType" TEXT NOT NULL,
    "agreedRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalBudget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "hoursLogged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursBudget" DOUBLE PRECISION,
    "tasksTotal" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "deliverables" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantTimesheet" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "keystrokesCount" INTEGER NOT NULL DEFAULT 0,
    "mouseMovements" INTEGER NOT NULL DEFAULT 0,
    "appsUsed" TEXT,
    "screenshots" TEXT,
    "productivityScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantTimesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantPerformance" (
    "id" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalTasks" INTEGER NOT NULL,
    "completedTasks" INTEGER NOT NULL,
    "onTimeRate" DOUBLE PRECISION NOT NULL,
    "customerRating" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "productivityScore" DOUBLE PRECISION NOT NULL,
    "grossEarnings" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "netEarnings" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "ownerSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "staffPoolPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "reinvestmentPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "roleWeights" TEXT NOT NULL DEFAULT '{}',
    "bonusPoolPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "payoutFrequency" TEXT NOT NULL DEFAULT 'monthly',
    "payoutDay" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "staffPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reinvestmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "calculatedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPayment" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "baseShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payslipUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "annualPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "features" TEXT NOT NULL,
    "responseTimeHours" INTEGER NOT NULL,
    "resolutionTimeHours" INTEGER,
    "channels" TEXT NOT NULL,
    "monthlyTicketsLimit" INTEGER,
    "monthlyHoursLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "color" TEXT NOT NULL DEFAULT '#1B3A4B',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSubscription" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" TIMESTAMP(3),
    "ticketsUsedThisCycle" INTEGER NOT NULL DEFAULT 0,
    "hoursUsedThisCycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketItem" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "slaResponseDue" TIMESTAMP(3),
    "slaResolutionDue" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "messages" TEXT,
    "attachments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "customerRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VectorIndex" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "tenantId" TEXT,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "embeddingDim" INTEGER NOT NULL DEFAULT 1536,
    "vector" TEXT NOT NULL,
    "textChunk" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectorIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBrief" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "description" TEXT NOT NULL,
    "targetMarket" TEXT,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timeline" TEXT,
    "goals" TEXT,
    "roadmap" TEXT,
    "analysisSummary" TEXT,
    "aiInsights" TEXT,
    "pricingTiers" TEXT,
    "recommendedTier" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentOption" TEXT,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "negotiationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "countries" TEXT,
    "regions" TEXT,
    "marketingRelevance" TEXT,
    "recommendedIndustries" TEXT,
    "suggestedCampaignTypes" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1B3A4B',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignScheduleSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "briefId" TEXT,
    "campaignName" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "depositReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "suggestedStartDates" TEXT,
    "suggestedEndDates" TEXT,
    "recommendedDuration" INTEGER,
    "linkedEventIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "approvedStartDate" TIMESTAMP(3),
    "approvedEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignScheduleSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxSession" (
    "id" TEXT NOT NULL,
    "visitorEmail" TEXT,
    "visitorName" TEXT,
    "visitorIp" TEXT,
    "visitorUserAgent" TEXT,
    "demoType" TEXT NOT NULL,
    "industry" TEXT,
    "maxActions" INTEGER NOT NULL DEFAULT 20,
    "actionsUsed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "mockTenantId" TEXT,
    "convertedToUser" BOOLEAN NOT NULL DEFAULT false,
    "convertedUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "SandboxSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence" TEXT,
    "alternatives" TEXT,
    "expectedOutcome" TEXT,
    "risks" TEXT,
    "rawContext" TEXT,
    "rawOutput" TEXT,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "sessionId" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "outcomeRecorded" BOOLEAN NOT NULL DEFAULT false,
    "actualOutcome" TEXT,
    "wasAccurate" BOOLEAN,
    "outcomeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApiKeyToApiProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApiKeyToApiProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClubMembershipToClubReward" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClubMembershipToClubReward_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Activity_tenantId_idx" ON "Activity"("tenantId");

-- CreateIndex
CREATE INDEX "EmailCampaign_tenantId_createdAt_idx" ON "EmailCampaign"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_campaignId_idx" ON "EmailLog"("campaignId");

-- CreateIndex
CREATE INDEX "EmailLog_leadId_idx" ON "EmailLog"("leadId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "Deal_tenantId_idx" ON "Deal"("tenantId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "SeoCrawl_seoProjectId_idx" ON "SeoCrawl"("seoProjectId");

-- CreateIndex
CREATE INDEX "SeoPage_seoProjectId_idx" ON "SeoPage"("seoProjectId");

-- CreateIndex
CREATE INDEX "SeoPage_url_idx" ON "SeoPage"("url");

-- CreateIndex
CREATE INDEX "SeoIssue_seoProjectId_idx" ON "SeoIssue"("seoProjectId");

-- CreateIndex
CREATE INDEX "SeoIssue_severity_idx" ON "SeoIssue"("severity");

-- CreateIndex
CREATE INDEX "SeoIssue_resolved_idx" ON "SeoIssue"("resolved");

-- CreateIndex
CREATE INDEX "SeoKeyword_seoProjectId_idx" ON "SeoKeyword"("seoProjectId");

-- CreateIndex
CREATE INDEX "SeoKeyword_keyword_idx" ON "SeoKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SeoBacklink_seoProjectId_idx" ON "SeoBacklink"("seoProjectId");

-- CreateIndex
CREATE INDEX "SeoBacklink_status_idx" ON "SeoBacklink"("status");

-- CreateIndex
CREATE INDEX "ContentCalendar_scheduledAt_idx" ON "ContentCalendar"("scheduledAt");

-- CreateIndex
CREATE INDEX "ContentCalendar_status_idx" ON "ContentCalendar"("status");

-- CreateIndex
CREATE INDEX "ContentCalendar_tenantId_idx" ON "ContentCalendar"("tenantId");

-- CreateIndex
CREATE INDEX "SocialPost_status_idx" ON "SocialPost"("status");

-- CreateIndex
CREATE INDEX "SocialPost_scheduledAt_idx" ON "SocialPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "SocialPost_tenantId_idx" ON "SocialPost"("tenantId");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_tenantId_idx" ON "AdCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_idx" ON "AnalyticsEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AiTask_status_idx" ON "AiTask"("status");

-- CreateIndex
CREATE INDEX "AiTask_tenantId_idx" ON "AiTask"("tenantId");

-- CreateIndex
CREATE INDEX "AiRecommendation_status_idx" ON "AiRecommendation"("status");

-- CreateIndex
CREATE INDEX "AiRecommendation_priority_idx" ON "AiRecommendation"("priority");

-- CreateIndex
CREATE INDEX "AiRecommendation_tenantId_idx" ON "AiRecommendation"("tenantId");

-- CreateIndex
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_tenantId_idx" ON "WorkflowRun"("tenantId");

-- CreateIndex
CREATE INDEX "BacklinkOpportunity_tenantId_idx" ON "BacklinkOpportunity"("tenantId");

-- CreateIndex
CREATE INDEX "BacklinkOpportunity_status_idx" ON "BacklinkOpportunity"("status");

-- CreateIndex
CREATE INDEX "BacklinkOpportunity_domainAuthority_idx" ON "BacklinkOpportunity"("domainAuthority");

-- CreateIndex
CREATE INDEX "BacklinkOutreach_status_idx" ON "BacklinkOutreach"("status");

-- CreateIndex
CREATE INDEX "BacklinkOutreach_tenantId_idx" ON "BacklinkOutreach"("tenantId");

-- CreateIndex
CREATE INDEX "AuthorityTracker_tenantId_idx" ON "AuthorityTracker"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityTracker_domain_tenantId_key" ON "AuthorityTracker"("domain", "tenantId");

-- CreateIndex
CREATE INDEX "SocialAnalysis_tenantId_idx" ON "SocialAnalysis"("tenantId");

-- CreateIndex
CREATE INDEX "SocialAnalysis_platform_idx" ON "SocialAnalysis"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAnalysis_platform_handle_tenantId_key" ON "SocialAnalysis"("platform", "handle", "tenantId");

-- CreateIndex
CREATE INDEX "CompetitorProfile_tenantId_idx" ON "CompetitorProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CompetitorProfile_threat_idx" ON "CompetitorProfile"("threat");

-- CreateIndex
CREATE INDEX "ExportMarket_tenantId_idx" ON "ExportMarket"("tenantId");

-- CreateIndex
CREATE INDEX "ExportMarket_opportunityScore_idx" ON "ExportMarket"("opportunityScore");

-- CreateIndex
CREATE UNIQUE INDEX "ExportMarket_countryCode_tenantId_key" ON "ExportMarket"("countryCode", "tenantId");

-- CreateIndex
CREATE INDEX "ExportProduct_tenantId_idx" ON "ExportProduct"("tenantId");

-- CreateIndex
CREATE INDEX "ExportProduct_category_idx" ON "ExportProduct"("category");

-- CreateIndex
CREATE INDEX "MarketResearch_tenantId_idx" ON "MarketResearch"("tenantId");

-- CreateIndex
CREATE INDEX "MarketResearch_type_idx" ON "MarketResearch"("type");

-- CreateIndex
CREATE INDEX "MarketResearch_status_idx" ON "MarketResearch"("status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_idx" ON "WhatsAppTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ChatbotConversation_tenantId_idx" ON "ChatbotConversation"("tenantId");

-- CreateIndex
CREATE INDEX "ChatbotConversation_status_idx" ON "ChatbotConversation"("status");

-- CreateIndex
CREATE INDEX "ChatbotMessage_conversationId_idx" ON "ChatbotMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ReviewMonitor_tenantId_idx" ON "ReviewMonitor"("tenantId");

-- CreateIndex
CREATE INDEX "ReviewMonitor_platform_idx" ON "ReviewMonitor"("platform");

-- CreateIndex
CREATE INDEX "Review_reviewMonitorId_idx" ON "Review"("reviewMonitorId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_tenantId_idx" ON "Review"("tenantId");

-- CreateIndex
CREATE INDEX "AbTestExperiment_tenantId_idx" ON "AbTestExperiment"("tenantId");

-- CreateIndex
CREATE INDEX "AbTestExperiment_status_idx" ON "AbTestExperiment"("status");

-- CreateIndex
CREATE INDEX "LandingPage_tenantId_idx" ON "LandingPage"("tenantId");

-- CreateIndex
CREATE INDEX "LandingPage_status_idx" ON "LandingPage"("status");

-- CreateIndex
CREATE INDEX "MonthlyReport_tenantId_idx" ON "MonthlyReport"("tenantId");

-- CreateIndex
CREATE INDEX "MonthlyReport_month_idx" ON "MonthlyReport"("month");

-- CreateIndex
CREATE INDEX "BusinessDiagnostic_tenantId_idx" ON "BusinessDiagnostic"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessDiagnostic_status_idx" ON "BusinessDiagnostic"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotWidget_widgetKey_key" ON "ChatbotWidget"("widgetKey");

-- CreateIndex
CREATE INDEX "ChatbotWidget_tenantId_idx" ON "ChatbotWidget"("tenantId");

-- CreateIndex
CREATE INDEX "AgentCycle_tenantId_idx" ON "AgentCycle"("tenantId");

-- CreateIndex
CREATE INDEX "AgentCycle_status_idx" ON "AgentCycle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Goal_tenantId_idx" ON "Goal"("tenantId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "OnboardingStep_tenantId_idx" ON "OnboardingStep"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_tenantId_step_key" ON "OnboardingStep"("tenantId", "step");

-- CreateIndex
CREATE INDEX "CalendarEvent_tenantId_idx" ON "CalendarEvent"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startDate_idx" ON "CalendarEvent"("startDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_sourceType_idx" ON "CalendarEvent"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_tenantId_idx" ON "TeamInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_idx" ON "ApprovalRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "BrandMention_tenantId_idx" ON "BrandMention"("tenantId");

-- CreateIndex
CREATE INDEX "BrandMention_keyword_idx" ON "BrandMention"("keyword");

-- CreateIndex
CREATE INDEX "BrandMention_sentiment_idx" ON "BrandMention"("sentiment");

-- CreateIndex
CREATE INDEX "BrandKeyword_tenantId_idx" ON "BrandKeyword"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandKeyword_keyword_tenantId_key" ON "BrandKeyword"("keyword", "tenantId");

-- CreateIndex
CREATE INDEX "PricingCalculation_recommendedPlan_idx" ON "PricingCalculation"("recommendedPlan");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressiveUnlock_tenantId_key" ON "ProgressiveUnlock"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");

-- CreateIndex
CREATE INDEX "BlogPost_featured_idx" ON "BlogPost"("featured");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");

-- CreateIndex
CREATE INDEX "BlogComment_status_idx" ON "BlogComment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DemoSession_sessionToken_key" ON "DemoSession"("sessionToken");

-- CreateIndex
CREATE INDEX "DemoSession_converted_idx" ON "DemoSession"("converted");

-- CreateIndex
CREATE INDEX "DemoSession_createdAt_idx" ON "DemoSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiProduct_slug_key" ON "ApiProduct"("slug");

-- CreateIndex
CREATE INDEX "ApiProduct_category_idx" ON "ApiProduct"("category");

-- CreateIndex
CREATE INDEX "ApiProduct_isActive_idx" ON "ApiProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiUsage_apiKeyId_idx" ON "ApiUsage"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiUsage_productId_idx" ON "ApiUsage"("productId");

-- CreateIndex
CREATE INDEX "ApiUsage_createdAt_idx" ON "ApiUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_tenantId_key" ON "ClubMembership"("tenantId");

-- CreateIndex
CREATE INDEX "ClubMembership_tierId_idx" ON "ClubMembership"("tierId");

-- CreateIndex
CREATE INDEX "ClubPoint_membershipId_idx" ON "ClubPoint"("membershipId");

-- CreateIndex
CREATE INDEX "ClubPoint_reason_idx" ON "ClubPoint"("reason");

-- CreateIndex
CREATE INDEX "ClubAdvertisement_tenantId_idx" ON "ClubAdvertisement"("tenantId");

-- CreateIndex
CREATE INDEX "ClubAdvertisement_status_idx" ON "ClubAdvertisement"("status");

-- CreateIndex
CREATE INDEX "ClubAdvertisement_placement_idx" ON "ClubAdvertisement"("placement");

-- CreateIndex
CREATE INDEX "EcommerceProduct_platform_idx" ON "EcommerceProduct"("platform");

-- CreateIndex
CREATE INDEX "EcommerceProduct_tenantId_idx" ON "EcommerceProduct"("tenantId");

-- CreateIndex
CREATE INDEX "EcommerceProduct_competitionLevel_idx" ON "EcommerceProduct"("competitionLevel");

-- CreateIndex
CREATE INDEX "ResellerOpportunity_type_idx" ON "ResellerOpportunity"("type");

-- CreateIndex
CREATE INDEX "ResellerOpportunity_platform_idx" ON "ResellerOpportunity"("platform");

-- CreateIndex
CREATE INDEX "ResellerOpportunity_riskLevel_idx" ON "ResellerOpportunity"("riskLevel");

-- CreateIndex
CREATE INDEX "ResellerOpportunity_isActive_idx" ON "ResellerOpportunity"("isActive");

-- CreateIndex
CREATE INDEX "ResellerApplication_tenantId_idx" ON "ResellerApplication"("tenantId");

-- CreateIndex
CREATE INDEX "ResellerApplication_opportunityId_idx" ON "ResellerApplication"("opportunityId");

-- CreateIndex
CREATE INDEX "ResellerApplication_status_idx" ON "ResellerApplication"("status");

-- CreateIndex
CREATE INDEX "ProfitEstimate_tenantId_idx" ON "ProfitEstimate"("tenantId");

-- CreateIndex
CREATE INDEX "AttributionEvent_tenantId_idx" ON "AttributionEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AttributionEvent_source_idx" ON "AttributionEvent"("source");

-- CreateIndex
CREATE INDEX "AttributionEvent_isFraud_idx" ON "AttributionEvent"("isFraud");

-- CreateIndex
CREATE INDEX "FraudRule_tenantId_idx" ON "FraudRule"("tenantId");

-- CreateIndex
CREATE INDEX "Cohort_tenantId_idx" ON "Cohort"("tenantId");

-- CreateIndex
CREATE INDEX "MarketingFunnel_tenantId_idx" ON "MarketingFunnel"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerJourney_tenantId_idx" ON "CustomerJourney"("tenantId");

-- CreateIndex
CREATE INDEX "PushNotification_tenantId_idx" ON "PushNotification"("tenantId");

-- CreateIndex
CREATE INDEX "SmsMessage_tenantId_idx" ON "SmsMessage"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_idx" ON "WebhookSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "Role"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_userId_projectId_key" ON "ProjectMember"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_userId_key" ON "SuperAdmin"("userId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_tenantId_idx" ON "AuditLogEntry"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_userId_idx" ON "AuditLogEntry"("userId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_action_idx" ON "AuditLogEntry"("action");

-- CreateIndex
CREATE INDEX "AuditLogEntry_severity_idx" ON "AuditLogEntry"("severity");

-- CreateIndex
CREATE INDEX "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteLabelConfig_tenantId_key" ON "WhiteLabelConfig"("tenantId");

-- CreateIndex
CREATE INDEX "ResellerCustomer_resellerTenantId_idx" ON "ResellerCustomer"("resellerTenantId");

-- CreateIndex
CREATE INDEX "ResellerCustomer_customerTenantId_idx" ON "ResellerCustomer"("customerTenantId");

-- CreateIndex
CREATE INDEX "ResellerCustomer_status_idx" ON "ResellerCustomer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResellerCustomer_resellerTenantId_customerTenantId_key" ON "ResellerCustomer"("resellerTenantId", "customerTenantId");

-- CreateIndex
CREATE INDEX "Commission_resellerTenantId_idx" ON "Commission"("resellerTenantId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_tenantId_status_idx" ON "Payment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_idx" ON "PaymentMethod"("tenantId");

-- CreateIndex
CREATE INDEX "FinancialAlert_tenantId_idx" ON "FinancialAlert"("tenantId");

-- CreateIndex
CREATE INDEX "FinancialAlert_type_idx" ON "FinancialAlert"("type");

-- CreateIndex
CREATE INDEX "FinancialAlert_severity_idx" ON "FinancialAlert"("severity");

-- CreateIndex
CREATE INDEX "FinancialAlert_isRead_idx" ON "FinancialAlert"("isRead");

-- CreateIndex
CREATE INDEX "FinancialAlert_isPlatformAlert_idx" ON "FinancialAlert"("isPlatformAlert");

-- CreateIndex
CREATE INDEX "PlatformPromotion_type_idx" ON "PlatformPromotion"("type");

-- CreateIndex
CREATE INDEX "PlatformPromotion_status_idx" ON "PlatformPromotion"("status");

-- CreateIndex
CREATE INDEX "PlatformPromotion_targetAudience_idx" ON "PlatformPromotion"("targetAudience");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralCode_key" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_programId_idx" ON "Referral"("programId");

-- CreateIndex
CREATE INDEX "Referral_referrerTenantId_idx" ON "Referral"("referrerTenantId");

-- CreateIndex
CREATE INDEX "Referral_refereeEmail_idx" ON "Referral"("refereeEmail");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PromoLink_shortCode_key" ON "PromoLink"("shortCode");

-- CreateIndex
CREATE INDEX "PromoLink_tenantId_idx" ON "PromoLink"("tenantId");

-- CreateIndex
CREATE INDEX "PromoLink_category_idx" ON "PromoLink"("category");

-- CreateIndex
CREATE INDEX "PromoLink_isActive_idx" ON "PromoLink"("isActive");

-- CreateIndex
CREATE INDEX "PromoLinkClick_promoLinkId_idx" ON "PromoLinkClick"("promoLinkId");

-- CreateIndex
CREATE INDEX "PromoLinkClick_clickedAt_idx" ON "PromoLinkClick"("clickedAt");

-- CreateIndex
CREATE INDEX "PromoLinkClick_country_idx" ON "PromoLinkClick"("country");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_competitorId_idx" ON "CompetitorAnalysis"("competitorId");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_tenantId_idx" ON "CompetitorAnalysis"("tenantId");

-- CreateIndex
CREATE INDEX "InvestorProfile_investorType_idx" ON "InvestorProfile"("investorType");

-- CreateIndex
CREATE INDEX "InvestorProfile_contactStatus_idx" ON "InvestorProfile"("contactStatus");

-- CreateIndex
CREATE INDEX "InvestorProfile_tenantId_idx" ON "InvestorProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CofounderProfile_contactStatus_idx" ON "CofounderProfile"("contactStatus");

-- CreateIndex
CREATE INDEX "CofounderProfile_tenantId_idx" ON "CofounderProfile"("tenantId");

-- CreateIndex
CREATE INDEX "PartnershipOpportunity_type_idx" ON "PartnershipOpportunity"("type");

-- CreateIndex
CREATE INDEX "PartnershipOpportunity_status_idx" ON "PartnershipOpportunity"("status");

-- CreateIndex
CREATE INDEX "PartnershipOpportunity_tenantId_idx" ON "PartnershipOpportunity"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_tenantId_key" ON "Distributor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_contractId_key" ON "Distributor"("contractId");

-- CreateIndex
CREATE INDEX "Distributor_status_idx" ON "Distributor"("status");

-- CreateIndex
CREATE INDEX "Distributor_tier_idx" ON "Distributor"("tier");

-- CreateIndex
CREATE INDEX "Distributor_country_idx" ON "Distributor"("country");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorContract_contractNumber_key" ON "DistributorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "DistributorContract_distributorId_idx" ON "DistributorContract"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorContract_status_idx" ON "DistributorContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LicensePackage_sku_key" ON "LicensePackage"("sku");

-- CreateIndex
CREATE INDEX "LicensePackage_distributorId_idx" ON "LicensePackage"("distributorId");

-- CreateIndex
CREATE INDEX "LicensePackage_isActive_idx" ON "LicensePackage"("isActive");

-- CreateIndex
CREATE INDEX "LicensePackage_tierRestriction_idx" ON "LicensePackage"("tierRestriction");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseAllocation_licenseKey_key" ON "LicenseAllocation"("licenseKey");

-- CreateIndex
CREATE INDEX "LicenseAllocation_distributorId_idx" ON "LicenseAllocation"("distributorId");

-- CreateIndex
CREATE INDEX "LicenseAllocation_packageId_idx" ON "LicenseAllocation"("packageId");

-- CreateIndex
CREATE INDEX "LicenseAllocation_status_idx" ON "LicenseAllocation"("status");

-- CreateIndex
CREATE INDEX "LicenseAllocation_customerEmail_idx" ON "LicenseAllocation"("customerEmail");

-- CreateIndex
CREATE INDEX "TerritoryExclusivity_distributorId_idx" ON "TerritoryExclusivity"("distributorId");

-- CreateIndex
CREATE INDEX "TerritoryExclusivity_country_idx" ON "TerritoryExclusivity"("country");

-- CreateIndex
CREATE INDEX "TerritoryExclusivity_status_idx" ON "TerritoryExclusivity"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryExclusivity_distributorId_country_region_city_key" ON "TerritoryExclusivity"("distributorId", "country", "region", "city");

-- CreateIndex
CREATE INDEX "DistributorPayout_distributorId_idx" ON "DistributorPayout"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorPayout_status_idx" ON "DistributorPayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorSupportTicket_ticketNumber_key" ON "DistributorSupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "DistributorSupportTicket_distributorId_idx" ON "DistributorSupportTicket"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorSupportTicket_status_idx" ON "DistributorSupportTicket"("status");

-- CreateIndex
CREATE INDEX "DistributorSupportTicket_tier_idx" ON "DistributorSupportTicket"("tier");

-- CreateIndex
CREATE INDEX "DistributorSupportTicket_priority_idx" ON "DistributorSupportTicket"("priority");

-- CreateIndex
CREATE INDEX "DistributorAuditLog_distributorId_idx" ON "DistributorAuditLog"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorAuditLog_action_idx" ON "DistributorAuditLog"("action");

-- CreateIndex
CREATE INDEX "DistributorAuditLog_createdAt_idx" ON "DistributorAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoPayment_gatewayPaymentId_key" ON "CryptoPayment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "CryptoPayment_tenantId_idx" ON "CryptoPayment"("tenantId");

-- CreateIndex
CREATE INDEX "CryptoPayment_distributorId_idx" ON "CryptoPayment"("distributorId");

-- CreateIndex
CREATE INDEX "CryptoPayment_status_idx" ON "CryptoPayment"("status");

-- CreateIndex
CREATE INDEX "CryptoPayment_cryptoCurrency_idx" ON "CryptoPayment"("cryptoCurrency");

-- CreateIndex
CREATE INDEX "CryptoPayment_createdAt_idx" ON "CryptoPayment"("createdAt");

-- CreateIndex
CREATE INDEX "CryptoPayment_tenantId_status_idx" ON "CryptoPayment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoWallet_address_key" ON "CryptoWallet"("address");

-- CreateIndex
CREATE INDEX "CryptoWallet_tenantId_idx" ON "CryptoWallet"("tenantId");

-- CreateIndex
CREATE INDEX "CryptoWallet_currency_idx" ON "CryptoWallet"("currency");

-- CreateIndex
CREATE INDEX "CryptoWallet_isPlatformWallet_idx" ON "CryptoWallet"("isPlatformWallet");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_isActive_idx" ON "PaymentGatewayConfig"("isActive");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_priority_idx" ON "PaymentGatewayConfig"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "InternalDepartment_name_key" ON "InternalDepartment"("name");

-- CreateIndex
CREATE INDEX "InternalDepartment_parentId_idx" ON "InternalDepartment"("parentId");

-- CreateIndex
CREATE INDEX "InternalDepartment_isActive_idx" ON "InternalDepartment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InternalEmployee_userId_key" ON "InternalEmployee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalEmployee_employeeId_key" ON "InternalEmployee"("employeeId");

-- CreateIndex
CREATE INDEX "InternalEmployee_departmentId_idx" ON "InternalEmployee"("departmentId");

-- CreateIndex
CREATE INDEX "InternalEmployee_employeeRole_idx" ON "InternalEmployee"("employeeRole");

-- CreateIndex
CREATE INDEX "InternalEmployee_platformRole_idx" ON "InternalEmployee"("platformRole");

-- CreateIndex
CREATE INDEX "InternalEmployee_status_idx" ON "InternalEmployee"("status");

-- CreateIndex
CREATE INDEX "InternalEmployeeActivity_employeeId_idx" ON "InternalEmployeeActivity"("employeeId");

-- CreateIndex
CREATE INDEX "InternalEmployeeActivity_action_idx" ON "InternalEmployeeActivity"("action");

-- CreateIndex
CREATE INDEX "InternalEmployeeActivity_createdAt_idx" ON "InternalEmployeeActivity"("createdAt");

-- CreateIndex
CREATE INDEX "FinancialReport_scope_scopeId_idx" ON "FinancialReport"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "FinancialReport_periodType_idx" ON "FinancialReport"("periodType");

-- CreateIndex
CREATE INDEX "FinancialReport_type_idx" ON "FinancialReport"("type");

-- CreateIndex
CREATE INDEX "FinancialReport_status_idx" ON "FinancialReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LlmProviderConfig_provider_key" ON "LlmProviderConfig"("provider");

-- CreateIndex
CREATE INDEX "LlmProviderConfig_isActive_idx" ON "LlmProviderConfig"("isActive");

-- CreateIndex
CREATE INDEX "LlmProviderConfig_priority_idx" ON "LlmProviderConfig"("priority");

-- CreateIndex
CREATE INDEX "LlmUsageRecord_providerConfigId_idx" ON "LlmUsageRecord"("providerConfigId");

-- CreateIndex
CREATE INDEX "LlmUsageRecord_provider_idx" ON "LlmUsageRecord"("provider");

-- CreateIndex
CREATE INDEX "LlmUsageRecord_createdAt_idx" ON "LlmUsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "LlmUsageRecord_tenantId_idx" ON "LlmUsageRecord"("tenantId");

-- CreateIndex
CREATE INDEX "LlmAuditEvent_providerConfigId_idx" ON "LlmAuditEvent"("providerConfigId");

-- CreateIndex
CREATE INDEX "LlmAuditEvent_eventType_idx" ON "LlmAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "LlmAuditEvent_createdAt_idx" ON "LlmAuditEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_negotiationId_key" ON "OnboardingSession"("negotiationId");

-- CreateIndex
CREATE INDEX "OnboardingSession_tenantId_idx" ON "OnboardingSession"("tenantId");

-- CreateIndex
CREATE INDEX "OnboardingSession_status_idx" ON "OnboardingSession"("status");

-- CreateIndex
CREATE INDEX "OnboardingDocument_sessionId_idx" ON "OnboardingDocument"("sessionId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_status_idx" ON "OnboardingDocument"("status");

-- CreateIndex
CREATE INDEX "NegotiationSession_tenantId_idx" ON "NegotiationSession"("tenantId");

-- CreateIndex
CREATE INDEX "NegotiationSession_status_idx" ON "NegotiationSession"("status");

-- CreateIndex
CREATE INDEX "NegotiationSession_currentState_idx" ON "NegotiationSession"("currentState");

-- CreateIndex
CREATE INDEX "NegotiationProposal_sessionId_idx" ON "NegotiationProposal"("sessionId");

-- CreateIndex
CREATE INDEX "NegotiationProposal_type_idx" ON "NegotiationProposal"("type");

-- CreateIndex
CREATE INDEX "NegotiationProposal_customerResponse_idx" ON "NegotiationProposal"("customerResponse");

-- CreateIndex
CREATE INDEX "NegotiationAuditEvent_sessionId_idx" ON "NegotiationAuditEvent"("sessionId");

-- CreateIndex
CREATE INDEX "NegotiationAuditEvent_eventType_idx" ON "NegotiationAuditEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAssistant_employeeId_key" ON "VirtualAssistant"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAssistant_email_key" ON "VirtualAssistant"("email");

-- CreateIndex
CREATE INDEX "VirtualAssistant_primarySkill_idx" ON "VirtualAssistant"("primarySkill");

-- CreateIndex
CREATE INDEX "VirtualAssistant_status_idx" ON "VirtualAssistant"("status");

-- CreateIndex
CREATE INDEX "VirtualAssistant_isAvailable_idx" ON "VirtualAssistant"("isAvailable");

-- CreateIndex
CREATE INDEX "AssistantService_category_idx" ON "AssistantService"("category");

-- CreateIndex
CREATE INDEX "AssistantService_isActive_idx" ON "AssistantService"("isActive");

-- CreateIndex
CREATE INDEX "AssistantAssignment_assistantId_idx" ON "AssistantAssignment"("assistantId");

-- CreateIndex
CREATE INDEX "AssistantAssignment_tenantId_idx" ON "AssistantAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "AssistantAssignment_status_idx" ON "AssistantAssignment"("status");

-- CreateIndex
CREATE INDEX "AssistantTimesheet_assistantId_idx" ON "AssistantTimesheet"("assistantId");

-- CreateIndex
CREATE INDEX "AssistantTimesheet_assignmentId_idx" ON "AssistantTimesheet"("assignmentId");

-- CreateIndex
CREATE INDEX "AssistantTimesheet_date_idx" ON "AssistantTimesheet"("date");

-- CreateIndex
CREATE INDEX "AssistantTimesheet_status_idx" ON "AssistantTimesheet"("status");

-- CreateIndex
CREATE INDEX "AssistantPerformance_assistantId_idx" ON "AssistantPerformance"("assistantId");

-- CreateIndex
CREATE INDEX "AssistantPerformance_periodStart_idx" ON "AssistantPerformance"("periodStart");

-- CreateIndex
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateIndex
CREATE INDEX "PayrollPeriod_periodStart_idx" ON "PayrollPeriod"("periodStart");

-- CreateIndex
CREATE INDEX "SalaryPayment_periodId_idx" ON "SalaryPayment"("periodId");

-- CreateIndex
CREATE INDEX "SalaryPayment_employeeId_idx" ON "SalaryPayment"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryPayment_status_idx" ON "SalaryPayment"("status");

-- CreateIndex
CREATE INDEX "SupportPlan_isActive_idx" ON "SupportPlan"("isActive");

-- CreateIndex
CREATE INDEX "SupportSubscription_tenantId_idx" ON "SupportSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "SupportSubscription_status_idx" ON "SupportSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicketItem_ticketNumber_key" ON "SupportTicketItem"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicketItem_tenantId_idx" ON "SupportTicketItem"("tenantId");

-- CreateIndex
CREATE INDEX "SupportTicketItem_status_idx" ON "SupportTicketItem"("status");

-- CreateIndex
CREATE INDEX "SupportTicketItem_priority_idx" ON "SupportTicketItem"("priority");

-- CreateIndex
CREATE INDEX "SupportTicketItem_subscriptionId_idx" ON "SupportTicketItem"("subscriptionId");

-- CreateIndex
CREATE INDEX "SupportTicketItem_tenantId_status_idx" ON "SupportTicketItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VectorIndex_sourceType_sourceId_idx" ON "VectorIndex"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "VectorIndex_tenantId_idx" ON "VectorIndex"("tenantId");

-- CreateIndex
CREATE INDEX "VectorIndex_embeddingModel_idx" ON "VectorIndex"("embeddingModel");

-- CreateIndex
CREATE INDEX "ProjectBrief_tenantId_idx" ON "ProjectBrief"("tenantId");

-- CreateIndex
CREATE INDEX "ProjectBrief_status_idx" ON "ProjectBrief"("status");

-- CreateIndex
CREATE INDEX "GlobalEvent_startDate_idx" ON "GlobalEvent"("startDate");

-- CreateIndex
CREATE INDEX "GlobalEvent_category_idx" ON "GlobalEvent"("category");

-- CreateIndex
CREATE INDEX "GlobalEvent_isActive_idx" ON "GlobalEvent"("isActive");

-- CreateIndex
CREATE INDEX "CampaignScheduleSuggestion_tenantId_idx" ON "CampaignScheduleSuggestion"("tenantId");

-- CreateIndex
CREATE INDEX "CampaignScheduleSuggestion_status_idx" ON "CampaignScheduleSuggestion"("status");

-- CreateIndex
CREATE INDEX "SandboxSession_status_idx" ON "SandboxSession"("status");

-- CreateIndex
CREATE INDEX "SandboxSession_expiresAt_idx" ON "SandboxSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SandboxAction_sessionId_idx" ON "SandboxAction"("sessionId");

-- CreateIndex
CREATE INDEX "AiDecision_tenantId_domain_idx" ON "AiDecision"("tenantId", "domain");

-- CreateIndex
CREATE INDEX "AiDecision_tenantId_createdAt_idx" ON "AiDecision"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "_ApiKeyToApiProduct_B_index" ON "_ApiKeyToApiProduct"("B");

-- CreateIndex
CREATE INDEX "_ClubMembershipToClubReward_B_index" ON "_ClubMembershipToClubReward"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoProject" ADD CONSTRAINT "SeoProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoCrawl" ADD CONSTRAINT "SeoCrawl_seoProjectId_fkey" FOREIGN KEY ("seoProjectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoPage" ADD CONSTRAINT "SeoPage_seoProjectId_fkey" FOREIGN KEY ("seoProjectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoIssue" ADD CONSTRAINT "SeoIssue_seoProjectId_fkey" FOREIGN KEY ("seoProjectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoKeyword" ADD CONSTRAINT "SeoKeyword_seoProjectId_fkey" FOREIGN KEY ("seoProjectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoBacklink" ADD CONSTRAINT "SeoBacklink_seoProjectId_fkey" FOREIGN KEY ("seoProjectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendar" ADD CONSTRAINT "ContentCalendar_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkOpportunity" ADD CONSTRAINT "BacklinkOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkOutreach" ADD CONSTRAINT "BacklinkOutreach_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "BacklinkOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityTracker" ADD CONSTRAINT "AuthorityTracker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAnalysis" ADD CONSTRAINT "SocialAnalysis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProfile" ADD CONSTRAINT "CompetitorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportMarket" ADD CONSTRAINT "ExportMarket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportProduct" ADD CONSTRAINT "ExportProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketResearch" ADD CONSTRAINT "MarketResearch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatbotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMonitor" ADD CONSTRAINT "ReviewMonitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewMonitorId_fkey" FOREIGN KEY ("reviewMonitorId") REFERENCES "ReviewMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbTestExperiment" ADD CONSTRAINT "AbTestExperiment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDiagnostic" ADD CONSTRAINT "BusinessDiagnostic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotWidget" ADD CONSTRAINT "ChatbotWidget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCycle" ADD CONSTRAINT "AgentCycle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMention" ADD CONSTRAINT "BrandMention_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandKeyword" ADD CONSTRAINT "BrandKeyword_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculation" ADD CONSTRAINT "PricingCalculation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressiveUnlock" ADD CONSTRAINT "ProgressiveUnlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ApiProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "ClubTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPoint" ADD CONSTRAINT "ClubPoint_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ClubMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAdvertisement" ADD CONSTRAINT "ClubAdvertisement_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ClubMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAdvertisement" ADD CONSTRAINT "ClubAdvertisement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcommerceProduct" ADD CONSTRAINT "EcommerceProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerApplication" ADD CONSTRAINT "ResellerApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ResellerOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerApplication" ADD CONSTRAINT "ResellerApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitEstimate" ADD CONSTRAINT "ProfitEstimate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudRule" ADD CONSTRAINT "FraudRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingFunnel" ADD CONSTRAINT "MarketingFunnel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerJourney" ADD CONSTRAINT "CustomerJourney_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAdmin" ADD CONSTRAINT "SuperAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteLabelConfig" ADD CONSTRAINT "WhiteLabelConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerCustomer" ADD CONSTRAINT "ResellerCustomer_resellerTenantId_fkey" FOREIGN KEY ("resellerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerCustomer" ADD CONSTRAINT "ResellerCustomer_customerTenantId_fkey" FOREIGN KEY ("customerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_resellerTenantId_fkey" FOREIGN KEY ("resellerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ReferralProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeTenantId_fkey" FOREIGN KEY ("refereeTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoLink" ADD CONSTRAINT "PromoLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoLinkClick" ADD CONSTRAINT "PromoLinkClick_promoLinkId_fkey" FOREIGN KEY ("promoLinkId") REFERENCES "PromoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "CompetitorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CofounderProfile" ADD CONSTRAINT "CofounderProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipOpportunity" ADD CONSTRAINT "PartnershipOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorContract" ADD CONSTRAINT "DistributorContract_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicensePackage" ADD CONSTRAINT "LicensePackage_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAllocation" ADD CONSTRAINT "LicenseAllocation_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAllocation" ADD CONSTRAINT "LicenseAllocation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "LicensePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryExclusivity" ADD CONSTRAINT "TerritoryExclusivity_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorPayout" ADD CONSTRAINT "DistributorPayout_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorSupportTicket" ADD CONSTRAINT "DistributorSupportTicket_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorAuditLog" ADD CONSTRAINT "DistributorAuditLog_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoPayment" ADD CONSTRAINT "CryptoPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoPayment" ADD CONSTRAINT "CryptoPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoWallet" ADD CONSTRAINT "CryptoWallet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalDepartment" ADD CONSTRAINT "InternalDepartment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InternalDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalEmployee" ADD CONSTRAINT "InternalEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalEmployee" ADD CONSTRAINT "InternalEmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "InternalDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalEmployee" ADD CONSTRAINT "InternalEmployee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "InternalEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalEmployeeActivity" ADD CONSTRAINT "InternalEmployeeActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "InternalEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReport" ADD CONSTRAINT "FinancialReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsageRecord" ADD CONSTRAINT "LlmUsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsageRecord" ADD CONSTRAINT "LlmUsageRecord_llmProviderConfigId_fkey" FOREIGN KEY ("llmProviderConfigId") REFERENCES "LlmProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmAuditEvent" ADD CONSTRAINT "LlmAuditEvent_llmProviderConfigId_fkey" FOREIGN KEY ("llmProviderConfigId") REFERENCES "LlmProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationSession" ADD CONSTRAINT "NegotiationSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationProposal" ADD CONSTRAINT "NegotiationProposal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "NegotiationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationAuditEvent" ADD CONSTRAINT "NegotiationAuditEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "NegotiationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualAssistant" ADD CONSTRAINT "VirtualAssistant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "InternalEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantAssignment" ADD CONSTRAINT "AssistantAssignment_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "VirtualAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantAssignment" ADD CONSTRAINT "AssistantAssignment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AssistantService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantAssignment" ADD CONSTRAINT "AssistantAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantTimesheet" ADD CONSTRAINT "AssistantTimesheet_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "VirtualAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantTimesheet" ADD CONSTRAINT "AssistantTimesheet_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssistantAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantPerformance" ADD CONSTRAINT "AssistantPerformance_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "VirtualAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantPerformance" ADD CONSTRAINT "AssistantPerformance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssistantAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSubscription" ADD CONSTRAINT "SupportSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SupportPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSubscription" ADD CONSTRAINT "SupportSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketItem" ADD CONSTRAINT "SupportTicketItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SupportSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketItem" ADD CONSTRAINT "SupportTicketItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VectorIndex" ADD CONSTRAINT "VectorIndex_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBrief" ADD CONSTRAINT "ProjectBrief_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignScheduleSuggestion" ADD CONSTRAINT "CampaignScheduleSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxSession" ADD CONSTRAINT "SandboxSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxAction" ADD CONSTRAINT "SandboxAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SandboxSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDecision" ADD CONSTRAINT "AiDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToApiProduct" ADD CONSTRAINT "_ApiKeyToApiProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApiKeyToApiProduct" ADD CONSTRAINT "_ApiKeyToApiProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "ApiProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClubMembershipToClubReward" ADD CONSTRAINT "_ClubMembershipToClubReward_A_fkey" FOREIGN KEY ("A") REFERENCES "ClubMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClubMembershipToClubReward" ADD CONSTRAINT "_ClubMembershipToClubReward_B_fkey" FOREIGN KEY ("B") REFERENCES "ClubReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

