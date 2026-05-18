// pages/api/analyze.js
// This runs on Vercel's servers — your API key is never exposed to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.' });
  }

  const { conceptSummary, totalStudents, studentSummary } = req.body;
  if (!conceptSummary) {
    return res.status(400).json({ error: 'Missing grade data in request.' });
  }

  const prompt = `You are an expert instructional analyst. Analyze this class performance data and return ONLY valid JSON with no markdown or explanation.

CONCEPT PERFORMANCE (${totalStudents} students):
${conceptSummary}

STUDENT AVERAGES:
${studentSummary}

Return this exact JSON structure:
{
  "overallMastery": <number 0-100>,
  "topBottleneck": "<concept name>",
  "urgentAction": "<one concrete sentence: what the teacher should do THIS week>",
  "conceptAnalysis": [
    {
      "name": "<concept name — must match input exactly>",
      "bottleneckScore": <0-100, higher = bigger problem>,
      "downstreamImpact": <0-100, how much does weakness here hurt later concepts>,
      "insight": "<one sentence: WHY students struggle here or what the data pattern suggests>",
      "recommendation": "<specific 1-2 sentence action the teacher can take>"
    }
  ],
  "studentRisk": [
    {
      "id": "<student_id>",
      "riskScore": <0-100, higher = more at risk>,
      "status": "High Risk|Moderate Risk|On Track",
      "support": "<specific support recommendation for this student>"
    }
  ],
  "recommendations": [
    {
      "priority": "High|Medium|Low",
      "type": "Reteach|Intervention|Practice|Review|Enrichment",
      "title": "<short action title>",
      "detail": "<2-3 sentences: what to do, how, expected outcome>",
      "audience": "whole class|small group|individual students",
      "timing": "this week|before next unit|ongoing"
    }
  ],
  "nextSteps": [
    "<concrete improvement for next semester — 1 sentence>",
    "<concrete improvement for next semester — 1 sentence>",
    "<concrete improvement for next semester — 1 sentence>"
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean);

    return res.status(200).json(analysis);
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze data' });
  }
}
