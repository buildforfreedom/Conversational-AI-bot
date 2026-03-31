# Find A Friend | V1 Architecture Wrapper

Welcome to the AI Consultant mono-repo! This repository is divided into two strict structures to maintain clean separation of concerns for both styling and automated interactions.

## 📁 Service A: `frontend-service`
This folder contains the extremely lightweight, aesthetic V0 landing page. 
- **How it's built**: Zero dependencies. Vanilla HTML5 (`index.html`), CSS3 with Glassmorphism variables (`styles.css`), and an intersection observer script for parallax reveals (`script.js`).
- **Why**: Faster load times, instant SEO hits, and simple deployment to global CDNs.

## 📁 Service B: `backend-service`
This folder houses our NodeJS V1 automated AI conversational hook!
- **How it's built**: `whatsapp-web.js` (for native WhatsApp bridging), `sqlite3` (for chat history retention and user identification), and `@google/generative-ai` (free-tier LLM integration).
- **Core Rules**: Hardcapped at 150 words per response, with a mandatory 30-second intentional queue delay to simulate a real human typing.

*The V1 codebase is completely finalized and mapped for end-to-end testing.*
