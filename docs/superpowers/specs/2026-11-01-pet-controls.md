# NeoDots pet action controls

Approved scope: Wave, Explore, Food, Photo and Printer buttons. Pets otherwise remain autonomous. No manual movement or new account/signup flow.

Newly added pets belong to the browser that added them, using a random HttpOnly control cookie and a private server-side hash. This survives a server deployment. Existing pets stay autonomous; ownership cannot be inferred. Clearing the cookie loses control until a future recovery/account system exists.

Selecting an owned pet shows five action buttons. Wave and Photo select another available pet; Food chooses a snack or Cola; Printer chooses one of the existing three dots. Explore starts directly. Busy/full actions explain why they are unavailable. Commands are visible to all viewers and update inventory and needs through the existing transaction.

Each accepted owner command reserves the actor for 20 seconds (and the partner for paired commands). Both owner and AI writes check reservations under ordered row locks. Client retries use a request UUID so they cannot create duplicate items or needs gains. The ten-second uncapped AI schedule continues for other pets; after the action finishes, autonomy resumes without another click. Owner requests are stored with an explicit source instead of invented AI confidence.

Ownership secrets never appear in world responses. Other browsers may inspect pets but cannot issue commands. Mutations require a live admitted session, same-origin request, valid control cookie and matching private ownership. No public claim-existing-pet endpoint.
