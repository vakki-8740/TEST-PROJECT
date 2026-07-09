# Premium iOS Call UI – Complete

## What was done
- Replaced call signaling from RTDB/subcollections to Firestore `arrayUnion` on call doc
- Changed call doc ID from fixed `call_${userId}` to unique per session (`call_${timestamp}_${random}`)
- Implemented premium iOS-style three-overlay call UI in both **admin** and **user** panels:
  - **Incoming**: Slide-to-answer with avatar, name, call type, ringtone, decline button
  - **Outgoing**: Avatar, name, calling status, red cancel button
  - **Active**: Big avatar, name, timer, bottom control bar (mute/speaker/end)
- Added `toggleMute`, `toggleSpeaker`, `playRingtone`/`stopRingtone`, slide-to-answer gesture
- Removed all old overlay DOM refs (`callOverlay`, `callAvatar`, `callName`, etc.)

## Files modified
- `public/user/index.html` – premium CSS + three overlays
- `public/user/app.js` – premium overlay JS functions
- `public/admin/index.html` – premium CSS + three overlays
- `public/admin/app.js` – premium overlay JS functions

## Verification
- No remaining references to old DOM IDs (`callOverlay`, `callAvatar`, `callStatusText`, `callActions`, `callRejectBtn`, `callAcceptBtn`, `callCancelBtn`, `callEndBtn`)
- Both user and admin use the same premium three-overlay structure with consistent IDs
