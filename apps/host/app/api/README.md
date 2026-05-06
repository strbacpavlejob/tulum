# API Routes

This directory contains all Next.js API route handlers for the Tulum Host application.

## Structure

All API routes follow RESTful conventions:

- `GET` - Retrieve resources
- `POST` - Create new resources
- `PATCH` - Update existing resources
- `DELETE` - Remove resources

## Available Endpoints

### Venues

- `GET /api/venues` - Get all venues or filter by host_id
- `GET /api/venues/[id]` - Get a specific venue
- `POST /api/venues` - Create a new venue
- `PATCH /api/venues/[id]` - Update a venue
- `DELETE /api/venues/[id]` - Delete a venue

### Events

- `GET /api/events` - Get all events or filter by venue_id/status
- `GET /api/events/[id]` - Get a specific event
- `POST /api/events` - Create a new event
- `PATCH /api/events/[id]` - Update an event
- `DELETE /api/events/[id]` - Delete an event

### Users

- `GET /api/users` - Get user by id or search by email
- `POST /api/users` - Create a new user
- `PATCH /api/users` - Update a user
- `DELETE /api/users` - Delete a user

### Guests

- `GET /api/users/guests` - Get guest by user_id
- `POST /api/users/guests` - Create a new guest
- `PATCH /api/users/guests` - Update a guest
- `DELETE /api/users/guests` - Delete a guest

### Hosts

- `GET /api/users/hosts` - Get host by user_id
- `POST /api/users/hosts` - Create a new host
- `DELETE /api/users/hosts` - Delete a host

### Settings

- `GET /api/users/settings` - Get user settings
- `PATCH /api/users/settings` - Update user settings

### Favorites

- `GET /api/favorites` - Get user favorites or check if event is favorited
- `POST /api/favorites` - Add a favorite
- `DELETE /api/favorites` - Remove a favorite

### Tickets

- `GET /api/tickets` - Get tickets by guest_id, event_id, or ticket id
- `POST /api/tickets` - Create a new ticket
- `DELETE /api/tickets` - Delete a ticket

### Matches

- `GET /api/matches` - Get matches by guest_id, event_id, or match id
- `POST /api/matches` - Create a new match
- `DELETE /api/matches` - Delete a match

### Chats

- `GET /api/chats` - Get chat by id or match_id
- `POST /api/chats` - Create a new chat
- `DELETE /api/chats` - Delete a chat

### Chat Messages

- `GET /api/chats/messages` - Get messages for a chat
- `POST /api/chats/messages` - Send a new message
- `PATCH /api/chats/messages` - Mark a message as read
- `DELETE /api/chats/messages` - Delete a message

### Geocoding

- `GET /api/geocode` - Geocode an address using OpenStreetMap Nominatim

## Authentication

All routes are protected with Clerk authentication. The `auth()` function from `@clerk/nextjs/server` is used to verify the user's session.

## Database Access

Routes use Supabase as the database backend. The Supabase client is configured with Clerk JWT tokens for Row Level Security (RLS) policy enforcement.

## Client Usage

Use the provided API client in `lib/api-client.ts` for type-safe API calls from client components:

```typescript
import { getVenues, createVenue } from "@/lib/api-client";

// Fetch venues
const venues = await getVenues();

// Create a venue
const newVenue = await createVenue({
  name: "My Venue",
  host_id: "user_123",
  // ... other fields
});
```

## Error Handling

All routes return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (not authenticated)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include an `error` field with a description:

```json
{
  "error": "Error message here"
}
```
