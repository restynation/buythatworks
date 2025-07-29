# WorksWith - Mac Monitor Compatibility

A web service where users can verify and share whether a Mac computer and external monitor work together at full performance, based on crowdsourced "connection graphs."

## Features

- **Browse Combinations**: View real and aspirational Mac + monitor setups with filtering
- **Upload Setups**: Create interactive device graphs using React Flow
- **Detail Views**: Explore individual setups with read-only graphs
- **Share & Delete**: Link sharing and owner-only deletion with PIN protection
- **Device Database**: Comprehensive catalog of Mac computers and monitors

## Tech Stack

- **Frontend**: Next.js 14, React Flow, Tailwind CSS, Zustand
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage)
- **Authentication**: PIN-based (4-digit) for setup ownership
- **Deployment**: Vercel (frontend) + Supabase (backend)

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the database schema:
   ```sql
   -- In Supabase SQL Editor, run:
   -- Copy and paste contents of supabase/schema.sql
   ```
3. Insert seed data:
   ```sql
   -- Copy and paste contents of supabase/seed.sql
   ```
4. Create Storage bucket:
   - Go to Storage in Supabase dashboard
   - Create bucket named `setup-images`
   - Set it to public

### 3. Edge Functions

Deploy the Edge Functions to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
supabase functions deploy create-setup
supabase functions deploy delete-setup
```

### 4. Local Development

1. Clone and install dependencies:
   ```bash
   git clone <your-repo>
   cd workswith
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Visit http://localhost:3000

## Project Structure

```
├── app/                    # Next.js 14 App Router
│   ├── combinations/       # Combinations listing and detail pages
│   ├── finder/             # Finder page (coming soon)
│   ├── upload/             # Upload canvas page
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── CombinationsList.tsx
│   ├── CombinationDetail.tsx
│   ├── UploadCanvas.tsx
│   ├── DeviceNode.tsx      # React Flow custom node
│   └── Navigation.tsx
├── lib/                    # Utilities and stores
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # TypeScript definitions
│   └── stores/             # Zustand stores
├── supabase/               # Database and Edge Functions
│   ├── schema.sql          # Database schema
│   ├── seed.sql            # Sample data
│   └── edge-functions/     # Serverless functions
└── README.md
```

## Database Schema

### Core Tables

- `device_types`: Computer, monitor, hub, mouse, keyboard
- `port_types`: TYPE_C, HDMI, DP, etc.
- `products`: Mac computers and monitors with metadata
- `setups`: User-created device configurations
- `setup_blocks`: Individual devices in a setup
- `setup_edges`: Connections between devices

### Key Features

- **Row Level Security (RLS)**: Anonymous read access, restricted writes
- **Materialized Views**: Fast filtering by device combinations
- **Unique Constraints**: One computer per setup
- **Soft Deletes**: PIN-protected setup deletion
- **Indexes**: Optimized for listing and filtering queries

## API Endpoints

### Supabase Auto-generated (PostgREST)
- `GET /rest/v1/setups` - List setups with filters
- `GET /rest/v1/products` - Get device catalog
- `GET /rest/v1/device_types` - Get device types

### Edge Functions
- `POST /functions/v1/create-setup` - Create new setup with validation
- `POST /functions/v1/delete-setup` - Delete setup with PIN verification

## User Flows

### 1. Browse Setups
1. Visit `/combinations`
2. Filter by devices or "real only"
3. View setup cards with metadata
4. Click for detailed view

### 2. Upload Setup
1. Visit `/upload`
2. Build device graph using React Flow
3. Connect devices with cables
4. Validate and submit with metadata
5. Get shareable link

### 3. View Detail
1. Navigate to `/combinations/[id]`
2. See setup metadata and devices
3. Explore read-only graph
4. Share link or delete (with PIN)

## Validation Rules

- **V-01**: Exactly one computer per setup
- **V-02**: All devices must be connected
- **V-03**: Computers/monitors need product selection
- **V-04**: Other devices need custom names
- **V-05**: 4-digit PIN required for deletion

## Deployment

### Frontend (Vercel)

1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Supabase)

1. Database schema applied
2. Edge Functions deployed
3. Storage bucket configured
4. RLS policies active

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes with tests
4. Submit a pull request

## Future Enhancements

- **Finder Tool**: Compatibility scoring algorithm
- **User Authentication**: Replace PIN with email/OAuth
- **Real-time Updates**: Live feed of new setups
- **Performance Metrics**: Actual FPS/resolution data
- **Device Reviews**: Community ratings and comments

## License

MIT License - see LICENSE file for details. 