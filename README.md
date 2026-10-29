# SkillBridge – Trust-First Platform for Skilled Service Workers (MERN)

SkillBridge sirf "worker booking site" nahi hai. Ye customers aur local skilled workers (electrician, plumber, cleaner, technician…) ke beech **trust, safety aur skill verification** ka gap solve karta hai.

Customer ko booking se pehle dikhta hai: worker ka **ID verify hua ya nahi**, **skills kis evidence par based hain**, **reviews sirf real completed jobs se aaye ya nahi**, aur **kya verify NAHI hua**.

> **Signature feature – Worker QR Card:** Har registered worker ko ek printable QR card milta hai. Customer ghar ke darwaze par QR scan karta hai aur **live** profile, verification status, rating aur reviews dekh leta hai.

---

## 1. Kya-kya bana hai (MVP)

| Module | Features |
|---|---|
| **Customer** | Register/login, service + city + pincode + date se search, **job-match score** ke sath sorted results, worker profile, booking request, 4-digit **arrival code**, extra-charge approve/decline, review (sirf completed booking par), complaint/report |
| **Worker** | Profile (skills, experience, rate, availability, areas), photo + portfolio upload, verification documents submit (consent ke sath), booking accept/reject/start/complete, extra amount ki request, **QR card print + reset** |
| **Trust** | Identity, Skills, Background **alag-alag** badges, date + expiry ke sath; "What we can show" vs "What is not verified" list; sub-ratings (punctuality, communication, quality, estimate adherence) |
| **Admin** | Verification queue (private document dekhna, verify/reject), complaints resolve/dismiss, workers list + suspend/reinstate |
| **QR scan page** | `/w/<token>` – public, live data, phone/email/address **nahi** dikhata |

## 2. Tech stack

- **Frontend:** React 18 + Vite, React Router, Axios, Tailwind CSS
- **Backend:** Node.js + Express, Mongoose
- **DB:** MongoDB (local ya Atlas)
- **Security:** JWT in HTTP-only cookie, bcrypt, Zod validation, Helmet, rate-limit, role + ownership checks, private document storage
- **QR:** `qrcode` package (server-side generation)

## 3. Folder structure

```
skillbridge/
├── server/
│   ├── src/
│   │   ├── index.js              # Express app
│   │   ├── seed.js               # demo data (MOCK)
│   │   ├── models/               # User, WorkerProfile, Booking, Review, VerificationRecord, Complaint
│   │   ├── routes/               # auth, workers, bookings, reviews, complaints, admin, public
│   │   ├── middleware/           # auth (JWT + roles), error/validation
│   │   └── utils/                # trust.js (explainable trust), matching.js (weighted score), stats.js
│   └── .env.example
└── client/
    └── src/
        ├── pages/                # Home, Workers, WorkerDetail, PublicCard (QR), Auth, Bookings, WorkerDashboard, QRCardPage, Admin
        ├── components/           # Navbar, TrustPanel, WorkerCard, ReportForm, ui
        └── context/AuthContext.jsx
```

## 4. Run kaise karein

**Requirements:** Node 18+, MongoDB (local `mongod` ya MongoDB Atlas URI)

```bash
# 1) dependencies
npm run install:all

# 2) server env
cp server/.env.example server/.env
#   -> JWT_SECRET ko koi lamba random string banao
#   -> MONGO_URI check karo (Atlas use kar rahe ho to wahan ka URI)

# 3) demo data
npm run seed

# 4) do terminals mein
npm run server     # http://localhost:5000
npm run client     # http://localhost:5173
```

**Demo logins** (password sabka: `Password@123`)

| Role | Email |
|---|---|
| Admin | admin@skillbridge.test |
| Customer | customer@skillbridge.test |
| Worker (ID + skills verified) | rahul@skillbridge.test |
| Worker (ID verified) | imran@skillbridge.test |
| Worker (ID pending) | anita@skillbridge.test |

**Demo flow (hackathon presentation ke liye):**
1. Worker `rahul` se login → *QR card* page → card dikhao.
2. Phone se QR scan karo (ya `http://localhost:5173/w/<token>` kholo; token card ke neeche likha hota hai) → live trust page.
3. Customer login → "Electrician, Delhi" search → match score hover karo → booking bhejo.
4. Worker accept kare → customer ko **arrival code** dikhta hai → worker code daal kar job start kare → extra amount maange → customer approve kare → complete.
5. Customer review likhe (sirf ab possible) → worker ki rating update.
6. Admin: nayi verification request verify karo → worker ka badge live change ho jata hai (QR page par bhi).

## 5. QR card kaise kaam karta hai

1. Worker register karta hai → profile ke sath ek random `qrToken` (96-bit) ban jata hai.
2. `GET /api/workers/me/qr` → QR image + URL (`CLIENT_URL/w/<token>`).
3. Scan karne par `GET /api/public/w/:token` **live DB data** deta hai.
4. **Design decisions (jaan-bujh kar):**
   - Card par **"Verified" likha nahi hota**; sirf "scan to check". Isse purana ya fake card galat status nahi dikha sakta.
   - Phone / email / ghar ka address public page par nahi aata.
   - Card kho jaye → *Reset QR* → purana QR turant band.
   - Suspended account ka QR "invalid" dikhata hai.
   - Har scan count hota hai (`qrScans`), rate-limited hai.

## 6. API summary

| Method | Endpoint | Kaam |
|---|---|---|
| POST | `/api/auth/register` , `/login` , `/logout` · GET `/me` | Auth (admin self-register nahi ho sakta) |
| GET | `/api/workers?service&city&pincode&date&minRating&verifiedOnly` | Search + match score |
| GET | `/api/workers/:id` | Public profile + trust + reviews |
| GET/PATCH | `/api/workers/me` | Apna profile (verification fields worker set nahi kar sakta) |
| POST | `/api/workers/me/photo` , `/portfolio` | Public images |
| POST | `/api/workers/me/verifications` | Private document + consent |
| GET | `/api/workers/me/qr` · POST `/me/qr/rotate` | QR card |
| GET | `/api/public/w/:token` | QR scan page data |
| POST/GET | `/api/bookings` , `/me` | Booking create/list |
| PATCH | `/api/bookings/:id/status` | Lifecycle (role-wise rules) |
| POST/PATCH | `/api/bookings/:id/revision` | Extra-charge request / approval |
| POST | `/api/reviews` | Sirf completed booking ke customer ko |
| POST/GET | `/api/complaints` , `/me` | Report |
| * | `/api/admin/...` | Verification queue, document, complaints, users, reviews moderation |

## 7. Trust aur matching ka logic

- **Trust (`utils/trust.js`)** – koi mystery number nahi. Har cheez evidence ke sath: kya verify hua, kab, expiry, aur `notVerified` list.
- **Matching (`utils/matching.js`)** – weights: skill 35%, location 20%, experience 15%, availability 10%, rating 10% (Bayesian average), verification 10%. Breakdown UI mein hover par dikhta hai. AI ki zarurat nahi.

## 8. Security jo already laga hai

- Review ke `customer` / `worker` ID **booking se server par** nikalte hain, body se nahi.
- Worker `verification` fields PATCH nahi kar sakta (Zod `.strict()`).
- ID documents `private_uploads/` mein, static serve nahi hote; sirf admin endpoint se. Decision ke baad delete.
- Phone numbers booking accept hone ke baad hi dikhte hain.
- Arrival code sirf customer ko dikhta hai.

---

## 9. ⚠️ Mock / demo cheezein (honest note)

- `seed.js` ka **sab data fictional** hai. Rahul ka background check `isMock: true` hai aur UI mein "Demo data (not a real check)" dikhta hai.
- **Real criminal-record / background check integrated nahi hai.** Real provider (jaise authorized verification vendors) se agreement + user consent + legal review ke baad hi add karo. Criminal record public mat dikhao, sirf "completed / pending / unavailable" status.
- Admin abhi **manual document review** karta hai; Aadhaar/DigiLocker jaisi government integration nahi hai.
- Is project ko mere sandbox mein **build + syntax + logic smoke test** kiya gaya hai, lekin **live MongoDB ke sath end-to-end test nahi** hua. Pehli baar chalane par `npm run seed` ke baad demo flow ek baar khud chala ke dekh lena.

## 10. Aage kya update karna hai (roadmap)

**Pehle (production se pehle zaroori)**
- [ ] `JWT_SECRET` strong rakho, `NODE_ENV=production`, HTTPS lagao; alag domain ho to `COOKIE_SAMESITE=none`
- [ ] Image/document storage ko **Cloudinary / S3** par shift karo (abhi local disk, Render par restart ke baad file ud jati hai)
- [ ] CSRF protection (alag-domain cookie setup mein) + email verification + forgot password
- [ ] Privacy policy, terms, consent text, data-retention policy (legal review)
- [ ] Automated tests (Jest + Supertest) – khaas kar booking/review rules

**Phir (features)**
- [ ] Real background-check provider integration (consent flow ke sath)
- [ ] Skill assessment test / practical-test booking
- [ ] Payments (Razorpay) + escrow-style release on completion
- [ ] Maps / distance filter (OpenStreetMap ya Google Maps)
- [ ] Notifications (email, SMS/WhatsApp) + Socket.IO live updates
- [ ] In-app chat, trusted-contact share, SOS button
- [ ] Hindi UI (i18n), worker ke liye low-literacy friendly flow
- [ ] Review moderation UI (backend ready: `PATCH /api/admin/reviews/:id`)
- [ ] Admin: audit log, verification expiry reminders, appeals process

## 11. Deployment

- **Frontend:** Vercel/Netlify – `client/` folder, build `npm run build`, env `VITE_API_URL=https://<your-api>`
- **Backend:** Render/Railway – `server/` folder, start `npm start`, env vars `.env.example` jaise
- **DB:** MongoDB Atlas (IP allow-list set karo)
- Backend env mein `CLIENT_URL` = frontend ka URL (CORS + QR link dono isi se bante hain)

## 12. Success metrics (claim mat karo, measure karo)

Worker dhoondhne ka time · booking completion rate · verified profiles ka % · complaint resolution time · repeat bookings.

---
*Pitch line:* **"SkillBridge – a trust-first platform: verified skills + transparent trust information + job-specific matching + accountability, with a QR ID card at the customer's door."**
