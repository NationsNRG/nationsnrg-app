import { supabase } from './supabase';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];
type InsightInsert = PublicSchema['Tables']['content_insights']['Insert'];
type InsightRow = PublicSchema['Tables']['content_insights']['Row'];
type InsightVariantInsert = PublicSchema['Tables']['content_insight_variants']['Insert'];
type InsightAssetInsert = PublicSchema['Tables']['content_insight_assets']['Insert'];
type InsightRunInsert = PublicSchema['Tables']['content_insight_runs']['Insert'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

type VariantType =
  | 'blog'
  | 'linkedin'
  | 'twitter_post'
  | 'twitter_thread'
  | 'newsletter'
  | 'youtube_long'
  | 'short_video'
  | 'email'
  | 'sales_brief';

interface MasterInsight {
  title: string;
  slug: string;
  canonicalSummary: string;
  canonicalBody: string;
  angle: string;
  audience: string;
  seoKeyword: string;
  confidenceScore: number;
  sourceType: string;
  sourceData: Json;
}

interface VariantDraft {
  variantType: VariantType;
  title: string;
  body: string;
  cta?: string;
  metadata?: Json;
}

interface AssetDraft {
  assetType:
    | 'hero_image_prompt'
    | 'thumbnail_prompt'
    | 'video_prompt'
    | 'avatar_script'
    | 'voiceover_script'
    | 'short_caption';
  content: string;
  metadata?: Json;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

async function logSystemActivity(params: {
  activityType: string;
  message: string;
  leadId?: string | null;
  details?: Json;
}): Promise<void> {
  const payload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: params.leadId ?? null,
    details: {
      message: params.message,
      payload: params.details ?? null,
    },
    created_at: nowIso(),
  };

  const { error } = await supabase.from('system_activity').insert(payload);
  if (error) {
    console.error('insight_engine_log_failed', error.message);
  }
}

class InsightEngine {
  async processInsights(): Promise<{ created: number; insightIds: string[] }> {
    const run = await this.createRun('system_signals', 'manual');

    try {
      const candidates = await this.collectCandidates();

      if (candidates.length === 0) {
        await this.completeRun(run.id, 'completed', null, { created: 0 });
        return { created: 0, insightIds: [] };
      }

      const insightIds: string[] = [];

      for (const candidate of candidates) {
        const master = this.buildMasterInsight(candidate);
        const inserted = await this.insertInsight(master);

        if (!inserted) {
          continue;
        }

        insightIds.push(inserted.id);
      }

      await this.completeRun(run.id, 'completed', null, { created: insightIds.length });

      return {
        created: insightIds.length,
        insightIds,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.completeRun(run.id, 'failed', message, null);
      await logSystemActivity({
        activityType: 'insight_process_failed',
        message,
      });

      throw error;
    }
  }

  async generateVariantsForInsight(insightId: string): Promise<{ success: boolean }> {
    const { data: insight, error } = await supabase
      .from('content_insights')
      .select('*')
      .eq('id', insightId)
      .maybeSingle();

    if (error || !insight) {
      throw new Error(error?.message ?? 'Insight not found');
    }

    const masterInsight = insight as InsightRow;

    const variants = this.buildVariants(masterInsight);
    const assets = this.buildAssets(masterInsight);

    const variantPayload: InsightVariantInsert[] = variants.map((variant) => ({
      insight_id: insightId,
      variant_type: variant.variantType,
      title: variant.title,
      body: variant.body,
      cta: variant.cta ?? null,
      metadata: variant.metadata ?? {},
      status: 'draft',
    }));

    const assetPayload: InsightAssetInsert[] = assets.map((asset) => ({
      insight_id: insightId,
      asset_type: asset.assetType,
      content: asset.content,
      metadata: asset.metadata ?? {},
    }));

    const { error: variantsError } = await supabase
      .from('content_insight_variants')
      .insert(variantPayload);

    if (variantsError) {
      throw new Error(variantsError.message);
    }

    const { error: assetsError } = await supabase
      .from('content_insight_assets')
      .insert(assetPayload);

    if (assetsError) {
      throw new Error(assetsError.message);
    }

    await supabase
      .from('content_insights')
      .update({ updated_at: nowIso() })
      .eq('id', insightId);

    return { success: true };
  }

  private async createRun(sourceType: string, triggerType: string) {
    const payload: InsightRunInsert = {
      source_type: sourceType,
      trigger_type: triggerType,
      status: 'processing',
      metadata: {},
      created_at: nowIso(),
    };

    const { data, error } = await supabase
      .from('content_insight_runs')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create insight run');
    }

    return data;
  }

  private async completeRun(
    runId: string,
    status: 'completed' | 'failed',
    errorMessage: string | null,
    metadata: Json
  ): Promise<void> {
    await supabase
      .from('content_insight_runs')
      .update({
        status,
        error_message: errorMessage,
        metadata,
        completed_at: nowIso(),
      })
      .eq('id', runId);
  }

  private async collectCandidates(): Promise<
    Array<{
      sourceType: string;
      title: string;
      summary: string;
      keyword: string;
      confidence: number;
      sourceData: Json;
    }>
  > {
    const candidates: Array<{
      sourceType: string;
      title: string;
      summary: string;
      keyword: string;
      confidence: number;
      sourceData: Json;
    }> = [];

    const [recentLeadsRes, trendsRes] = await Promise.all([
      supabase
        .from('discovered_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('analytics_daily')
        .select('*')
        .order('date', { ascending: false })
        .limit(7),
    ]);

    if (Array.isArray(recentLeadsRes.data) && recentLeadsRes.data.length > 0) {
      candidates.push({
        sourceType: 'recent_leads',
        title: 'New commercial energy opportunities are clustering in recent lead flow',
        summary:
          'Recent discovered leads suggest concentration in businesses that may benefit from procurement timing, supplier competition, and structured rate analysis.',
        keyword: 'commercial energy procurement trends',
        confidence: 72,
        sourceData: {
          leadCount: recentLeadsRes.data.length,
          leadIds: recentLeadsRes.data.map((lead) => lead.id),
        },
      });
    }

    if (Array.isArray(trendsRes.data) && trendsRes.data.length > 0) {
      const latest = trendsRes.data[0];
      candidates.push({
        sourceType: 'analytics_daily',
        title: 'Energy brokerage activity signals where margin and conversion are building',
        summary:
          'Daily analytics indicate where conversations, closes, and commissions are growing, creating a timely content angle for operators and procurement decision-makers.',
        keyword: 'energy brokerage market insights',
        confidence: 78,
        sourceData: {
          latestDate: latest.date,
          metrics: latest,
        },
      });
    }

    return candidates;
  }

  private buildMasterInsight(candidate: {
    sourceType: string;
    title: string;
    summary: string;
    keyword: string;
    confidence: number;
    sourceData: Json;
  }): MasterInsight {
    const title = normalizeString(candidate.title);
    const canonicalSummary = normalizeString(candidate.summary);
    const slug = slugify(title);

    return {
      title,
      slug,
      canonicalSummary,
      canonicalBody: `${canonicalSummary}

This insight highlights what commercial energy buyers and procurement-focused businesses should be watching right now. The pattern suggests that timing, contract structure, and supplier competition can materially influence cost outcomes and decision speed.

Key takeaway:
Businesses should not wait until contract pressure is high. A structured review of usage, renewal timing, and supplier options can create leverage before urgency reduces flexibility.

Why this matters:
- It improves negotiating position
- It helps identify savings opportunities earlier
- It gives operators a clearer decision framework
- It turns market movement into strategic action`,
      angle: 'market intelligence',
      audience: 'commercial energy buyers',
      seoKeyword: candidate.keyword,
      confidenceScore: normalizeNumber(candidate.confidence),
      sourceType: candidate.sourceType,
      sourceData: candidate.sourceData,
    };
  }

  private async insertInsight(master: MasterInsight): Promise<InsightRow | null> {
    const exists = await supabase
      .from('content_insights')
      .select('id')
      .eq('slug', master.slug)
      .maybeSingle();

    if (exists.data?.id) {
      return null;
    }

    const payload: InsightInsert = {
      slug: master.slug,
      title: master.title,
      canonical_summary: master.canonicalSummary,
      canonical_body: master.canonicalBody,
      angle: master.angle,
      audience: master.audience,
      seo_keyword: master.seoKeyword,
      source_type: master.sourceType,
      source_data: master.sourceData,
      confidence_score: master.confidenceScore,
      status: 'draft',
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data, error } = await supabase
      .from('content_insights')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      await logSystemActivity({
        activityType: 'insight_insert_failed',
        message: error?.message ?? 'Insert failed',
        details: payload,
      });
      return null;
    }

    return data;
  }

  private buildVariants(insight: InsightRow): VariantDraft[] {
    const title = normalizeString(insight.title);
    const summary = normalizeString(insight.canonical_summary);
    const body = normalizeString(insight.canonical_body);
    const keyword = normalizeString(insight.seo_keyword);

    return [
      {
        variantType: 'blog',
        title,
        body: `# ${title}

${summary}

## What the market is signaling

${body}

## What commercial buyers should do next

1. Review current contract timing
2. Compare supplier options before renewal pressure builds
3. Use historical usage to negotiate from data
4. Turn a simple rate review into a broader procurement strategy

## Final thought

The companies that prepare before urgency hits usually keep the most leverage.

**Primary keyword:** ${keyword}`,
        cta: 'Request a complimentary rate analysis.',
      },
      {
        variantType: 'linkedin',
        title,
        body: `${title}

A lot of businesses wait too long to review energy contracts.

That usually means less leverage, fewer supplier options, and rushed decisions.

What we are seeing:
• procurement timing matters
• structured rate analysis matters
• supplier competition matters

The real advantage is not just finding a lower rate.
It is creating decision leverage before urgency shows up.

If you run a commercial account, now is the time to review contract timing, usage patterns, and supplier options.`,
        cta: 'Message us for a commercial rate analysis.',
      },
      {
        variantType: 'twitter_post',
        title,
        body: `${title}

Commercial energy buyers gain leverage when they review contracts before urgency kicks in. Timing, supplier competition, and structure matter more than most people think.`,
      },
      {
        variantType: 'twitter_thread',
        title,
        body: `1/ ${title}

2/ Most businesses review energy too late.

3/ By then, urgency reduces negotiating power.

4/ Better approach:
- review usage early
- compare suppliers early
- structure decisions before deadlines

5/ The goal is not just a better rate.
It is leverage.

6/ Smart procurement starts before the contract forces action.`,
      },
      {
        variantType: 'newsletter',
        title,
        body: `Subject: ${title}

${summary}

This week’s business insight:
Commercial buyers create better outcomes when they evaluate energy decisions before contract pressure peaks.

Why it matters:
- more negotiating leverage
- cleaner supplier comparisons
- fewer rushed decisions

Action step:
Review upcoming renewal dates and usage data now.`,
      },
      {
        variantType: 'youtube_long',
        title: `${title} | What business owners need to know`,
        body: `HOOK:
Most businesses wait too long to evaluate energy contracts, and that costs them leverage.

INTRO:
Today we are breaking down what current market signals mean for commercial buyers and why procurement timing matters.

MAIN POINTS:
1. What the pattern is
2. Why it matters operationally
3. How leverage is lost
4. What to do now
5. Common mistakes
6. Final recommendation

CTA:
If you want a commercial rate analysis, start with your current usage and renewal window.`,
      },
      {
        variantType: 'short_video',
        title,
        body: `Hook: Most businesses wait too long to review their energy contracts.

Point: That reduces leverage.

What to do:
Review usage, supplier options, and timing before urgency takes over.

CTA: Get a commercial rate analysis.`,
      },
      {
        variantType: 'email',
        title,
        body: `${title}

${summary}

A quick review before renewal pressure builds can create far better options.

Reply if you want a commercial rate analysis.`,
      },
      {
        variantType: 'sales_brief',
        title,
        body: `Insight: ${title}

Summary:
${summary}

Broker talking points:
- Timing creates leverage
- Early review improves supplier competition
- Decisions should be usage-driven
- Use this insight to open commercial energy conversations`,
      },
    ];
  }

  private buildAssets(insight: InsightRow): AssetDraft[] {
    const title = normalizeString(insight.title);

    return [
      {
        assetType: 'hero_image_prompt',
        content: `Create a polished editorial hero image for a business energy market insight titled "${title}". Clean modern corporate style, charts, electricity procurement, executive decision-making, dark blue and green palette.`,
      },
      {
        assetType: 'thumbnail_prompt',
        content: `Create a YouTube thumbnail concept for "${title}". High contrast, business energy theme, modern charts, strong headline space, commercial energy visual language.`,
      },
      {
        assetType: 'video_prompt',
        content: `Generate cinematic b-roll prompts for a business insight video about "${title}". Include office buildings, utility bills, dashboard charts, negotiations, and commercial decision-making scenes.`,
      },
      {
        assetType: 'avatar_script',
        content: `On-camera delivery script opener for "${title}": Most businesses think energy procurement is only about price. It is really about timing, leverage, and decision structure.`,
      },
      {
        assetType: 'voiceover_script',
        content: `Voiceover summary for "${title}": Commercial energy buyers win when they move before contract urgency removes flexibility.`,
      },
      {
        assetType: 'short_caption',
        content: `${title} — timing matters more than most buyers think.`,
      },
    ];
  }
}

export const insightEngine = new InsightEngine();