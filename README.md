<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎓 TwoTop Manager - AI-Powered Academy Management System

> A comprehensive student and exam management system for educational institutions, powered by Google Gemini AI.

[![Deploy Status](https://img.shields.io/badge/deploy-ready-brightgreen)](https://github.com/choiyuns329/Two-Top-)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)](package.json)

View your app in AI Studio: https://ai.studio/apps/drive/15TxYV4HFylmtIzNmaqH0vrKm6oHX-yV4

## ✨ Features

### 📊 Dashboard
- Real-time overview of students and exam statistics
- Quick access to recent exams and performance metrics
- Visual analytics with charts and graphs

### 👥 Student Management
- Add, edit, and delete student profiles
- Track student information (name, school, phone)
- Add notes and observations for each student
- Search and filter capabilities

### 📝 Exam Management
- Create and manage exams (Ranking tests, Vocabulary tests, Word tests)
- Configure question types (Multiple choice, Subjective)
- Set passing thresholds and scoring criteria
- Batch score entry and individual editing
- Track wrong answers per student

### 🤖 AI-Powered Analytics
- **Gemini AI Integration**: Automated exam analysis and insights
- Performance trend analysis
- Personalized study recommendations
- Teacher-parent consultation support
- OCR for score extraction from images

### 📈 Advanced Analytics
- Student performance tracking over time
- School-wise comparisons
- Question-level difficulty analysis
- Pass/fail rate statistics
- Percentile rankings

### ☁️ Cloud Synchronization
- **Supabase Integration**: Real-time data sync across devices
- Local storage fallback for offline use
- Automatic conflict resolution
- Manual cloud push/pull options

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Gemini API Key** (for AI features) - Get it from [Google AI Studio](https://aistudio.google.com/apikey)
- **Supabase Account** (optional, for cloud sync) - Sign up at [Supabase](https://supabase.com)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/choiyuns329/Two-Top-.git
   cd Two-Top-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   
   Get your API key from: https://aistudio.google.com/apikey

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build Locally

```bash
npm run preview
```

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for:
- Cloudflare Pages (recommended)
- Vercel
- Netlify
- GitHub Pages

### Quick Deploy to Cloudflare Pages

1. Fork this repository
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Create a new project and connect your GitHub repository
4. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Add environment variable: `GEMINI_API_KEY`
5. Deploy!

## 🛠️ Tech Stack

- **Frontend Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom React components
- **Charts**: Recharts
- **AI**: Google Gemini API
- **Database**: Supabase (optional)
- **Storage**: LocalStorage + Cloud sync

## 📂 Project Structure

```
Two-Top-/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── StudentManagement.tsx
│   ├── ExamManagement.tsx
│   ├── Analytics.tsx
│   ├── Settings.tsx
│   └── Layout.tsx
├── services/           # API services
│   └── geminiService.ts
├── utils/             # Utility functions
├── types.ts           # TypeScript type definitions
├── App.tsx            # Main app component
├── index.tsx          # Entry point
├── vite.config.ts     # Vite configuration
└── package.json       # Dependencies

```

## 🔧 Configuration

### Supabase Setup (Optional)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL setup script in your Supabase SQL editor:

```sql
-- Students table
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT,
  phone TEXT,
  note TEXT,
  created_at BIGINT NOT NULL
);

-- Exams table
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  pass_threshold INTEGER,
  questions JSONB,
  target_schools JSONB,
  scores JSONB NOT NULL
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your security needs)
CREATE POLICY "Enable all access for authenticated users" ON students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON exams
  FOR ALL USING (auth.role() = 'authenticated');
```

3. Go to Settings page in the app and enter your Supabase URL and anon key

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powerful AI capabilities
- Supabase for real-time database functionality
- React and Vite communities for excellent tools

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by [choiyuns329](https://github.com/choiyuns329)
