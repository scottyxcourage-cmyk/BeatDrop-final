# BeatDrop YTS - Test Plan

## Environment
- Local server: http://localhost:3001
- External API: Madrin ytmp3 (may be unreliable — will verify error handling)

## Test 1: App Load & Animated Landing Page
**Goal**: Verify the app boots, shows loading animation, then renders the home page with cyber theme.

**Steps**:
1. Navigate to http://localhost:3001
2. Observe loading screen animation (rings + pulsing text)
3. Wait for it to auto-dismiss

**Pass criteria**:
- Loading screen appears with "BeatDrop" text
- After ~1s, loading screen fades out
- Home page renders with hero title "BeatDrop YTS"
- Stats grid shows 4 cards (Downloads, Favorites, Quality, Forever)
- Feature cards grid shows 4 items (Lightning Fast, Secure & Private, Customizable, All Devices)
- Background has dark color (#0a0a0f or very dark)
- Primary accent color is cyan (#00f0ff)

## Test 2: Sidebar Navigation (Collapse + Page Routing)
**Goal**: Verify sidebar collapses and all page routes render correctly.

**Steps**:
1. Click the sidebar toggle button (hamburger icon in sidebar header)
2. Verify sidebar collapses to icon-only rail
3. Click "Search" nav item → verify URL hash changes to #/search and page renders with search bar
4. Click "Favorites" nav item → verify #/favorites page shows empty state message "No favorites yet"
5. Click "Settings" nav item → verify settings page renders with toggle switches
6. Navigate to #/nonexistent → verify 404 page shows "404" and "Page Not Found"

**Pass criteria**:
- Sidebar width shrinks from 260px to ~72px when collapsed (nav text hidden, only icons visible)
- Each nav click changes the active nav item highlight (cyan left border)
- Search page shows search input + "Search" button
- Favorites page shows empty state with heart icon
- Settings page has "Animations" toggle, "Accent Color" options, "Clear" buttons
- 404 page shows large "404" text and a "Go Home" button

## Test 3: Search Flow & Error Handling
**Goal**: Verify search triggers API call, shows loading skeleton, and handles the API error response gracefully.

**Steps**:
1. Navigate to #/search
2. Type "never gonna give you up" in the search input
3. Click "Search" button
4. Observe loading skeleton placeholders appear
5. Wait for API response (expected: error from Madrin API)
6. Verify error is displayed gracefully (not a raw crash)

**Pass criteria**:
- Typing in search input is responsive
- Clicking "Search" shows skeleton loading cards (shimmer animation divs)
- On API error: either a "Search Failed" empty state message OR a toast notification with error text appears
- App does NOT crash or show a blank white page
- Search input remains usable after error

## Test 4: Settings - Accent Color Change
**Goal**: Verify changing accent color persists and applies globally.

**Steps**:
1. Navigate to #/settings
2. Note the current accent color (cyan circles)
3. Click the red color option (#ff4060)
4. Verify a toast notification appears saying "Accent color updated"
5. Verify the nav item active highlight changes from cyan to red
6. Navigate to #/ (home) and verify the gradient text uses the new color
7. Refresh the page → verify the red accent color persists

**Pass criteria**:
- Color option circle gets a white border (class 'active') after click
- Toast appears with "Accent color updated" text
- CSS variable --primary changes to #ff4060
- Sidebar active item uses red highlight instead of cyan
- After refresh, color is still red (localStorage persistence)

## Test 5: Favorites - Add/Remove via LocalStorage
**Goal**: Verify favorites can be added and removed, persisting across page loads.

**Steps**:
1. Navigate to #/search, search for something (will get error but result might show)
2. If no results: manually inject a test song via browser console to verify favorites flow
   - `Store.addFavorite({id:'test1', title:'Test Song', artist:'Test Artist', downloadUrl:'#'})`
3. Navigate to #/favorites
4. Verify "Test Song" appears in favorites list
5. Click the remove (trash) button on the card
6. Verify the card disappears
7. Refresh page → verify favorites is now empty

**Pass criteria**:
- After adding: favorites page shows 1 card with title "Test Song"
- After removing: card animates out (opacity 0, scale 0.9)
- Toast appears "Removed"
- After refresh: favorites page shows empty state "No favorites yet"

## Test 6: Keyboard Shortcuts
**Goal**: Verify Ctrl+K focuses search and number keys navigate.

**Steps**:
1. Be on home page (#/)
2. Press Ctrl+K
3. Verify search input is focused (cursor in input field)
4. Press Escape, then press "3" key
5. Verify page navigates to #/trending

**Pass criteria**:
- Ctrl+K focuses the search input on home page (if on different page, navigates to search page)
- Pressing "3" navigates to trending page (URL hash = #/trending, nav item highlighted)
