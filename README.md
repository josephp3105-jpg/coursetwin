# CourseTwin AI

Performance Twin for Schools — AI-powered course analytics for teachers.

## Setup

### 1. Get your Anthropic API key
Go to https://console.anthropic.com → API Keys → Create Key

### 2. Local development
```bash
npm install
```
Create a `.env.local` file (never commit this):
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```
Then run:
```bash
npm run dev
```
Open http://localhost:3000

### 3. Deploy to Vercel
1. Push this folder to a GitHub repository
2. Go to vercel.com → New Project → import your repo
3. In Vercel project settings → Environment Variables → add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from step 1
4. Deploy — your live URL will be `your-project.vercel.app`

## CSV Format
Upload a CSV with these columns:
```
student_id, student_name, concept, unit, score, max_score
```
Works with exports from Google Classroom, PowerSchool, Canvas, and Excel.

## How it works
- Teacher uploads a gradebook CSV
- `/api/analyze` parses the data and calls Claude AI (server-side, key is private)
- Dashboard shows bottlenecks, student risk, recommendations, and a shareable report
