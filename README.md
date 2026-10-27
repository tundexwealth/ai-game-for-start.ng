# Lagos Legends: Street Quest

A browser based Three.js street adventure set in a compact, fictional Lagos neighbourhood. The current playable slice includes the start.ng character, third person movement and camera, an escalating four-mission delivery chain, a neighborhood map, a clothing shop, eight staggered traffic cars split between faster and slower side-by-side tracks in both directions, and saved progress.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To make a static production build, run `npm run build`; the ready-to-host files are written to `dist/`.

## Controls

- **WASD** or arrow keys: move in the direction relative to the view
- **Drag with the mouse**: look around
- **E**: talk, deliver, browse the wardrobe, or enter/exit the parked car
- **In the car:** **W/S** drives forward/reverse; **A/D** or **left/right arrows** steer
- **Esc**: close the wardrobe
- The bottom-left map shows your position, parked and moving cars, pedestrians, and the current mission marker.

## start.ng identity and style

On a live `*.start.ng` address, the game asks start.ng's connect frame for the current player and uses the shared character colors, hair, hat, and accessories on the 3D model. The game never handles passwords or account credentials. Guests use the shared guest appearance and can sign in with the link in the header. On localhost, the game runs with the guest character.

## Current playable slice

1. Explore the Marina Quarter and meet Wale at the orange marked market stall.
2. Take his fabric bundle to Mama T and receive ₦120 and 15 reputation.
3. Carry Mama T’s finished outfit to Adebayo’s Tailoring. Receive ₦180 and 25 reputation.
4. Drive Adebayo’s long cross-quarter delivery to Harbour Depot. Receive ₦260 and 40 reputation.
5. Take the Depot Manager’s supply run down to South Market by car. Receive ₦360 and 60 reputation.
6. Visit Tide & Thread and spend cash on a garment or accessory. Clothing adds distinct geometry to the visible 3D character.
7. Navigate residential side streets, watch for pedestrians and traffic, and use the signed Marina Quarter / Market Street gateways at the neighborhood edges.
8. Reload the page to restore mission-chain progress, cash, reputation, owned items, and equipped outfit.
9. Mission deadlines tighten from 30 seconds on Wale’s first job to 20, 14, and 10 seconds on later deliveries.
10. Use the orange car near the starting area or the teal car beside Adebayo’s workshop for the later driving jobs.

Progress is stored in versioned, validated `localStorage`, separately for each signed-in start.ng player on the same browser. The 3D characters and environment are procedural placeholders, designed for later replacement with licensed, rig-compatible assets.
