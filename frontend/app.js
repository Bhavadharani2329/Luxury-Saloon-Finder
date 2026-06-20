/* 
========================================================================
   Bee (Beauty, Elevated.) - Core Application & Logic Engine
========================================================================
*/

let SALONS_DB = [];

const STYLISTS_DB = [
    { name: "Marco Rossini", role: "Creative Director", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80", rating: "4.9/5", bio: "Over 15 years styling in Milan & London. Specializes in bespoke editorial cuts." },
    { name: "Amrita Sen", role: "Master therapist", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80", rating: "5.0/5", bio: "Renowned wellness practitioner with specialty training in Himalayan therapies." },
    { name: "Elena Varga", role: "Lead Colorist", img: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&q=80", rating: "4.8/5", bio: "Ex-Paris styling editor specializing in organic French balayage highlights." },
    { name: "Vikram Rathore", role: "Grooming Director", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", rating: "4.9/5", bio: "Grooming consultant for high-fashion campaigns and executive spa styling." }
];

// Auth & Session States
let AUTH_TOKEN = localStorage.getItem("bee-token") || null;
let CURRENT_USER = null;

try {
    const storedUser = localStorage.getItem("bee-user");
    if (storedUser) {
        CURRENT_USER = JSON.parse(storedUser);
    }
} catch (e) {
    console.error("Error reading session storage", e);
}

const APP_STATE = {
    activePage: "home",
    selectedSalon: null,
    searchParams: {
        location: "all",
        service: "all",
        price: "all"
    },
    filterParams: {
        locations: [],
        categories: [],
        prices: [],
        minRating: 0,
        sort: "recommended"
    },
    bookingCart: [],
    bookingStylist: null,
    bookingDate: null,
    bookingSlot: null,
    bookingStep: 1,
    wishlist: [], // populated dynamically from CURRENT_USER favorites
    userProfile: {
        name: "",
        email: "",
        phone: "",
        membership: "None",
        joinedDate: "",
        rewardPoints: 2450,
        preferences: {
            skinType: "combination",
            hairType: "dry-curly",
            goals: ["anti-frizz", "deep-relaxation", "radiance"]
        },
        upcomingBookings: []
    },
    aiQuiz: {
        step: 1,
        answers: {
            goal: null,
            neighborhood: null,
            vibe: null
        }
    }
};

let ACTIVE_OWNER_SALON = null;

// ========================================================================
// 2.5 API, Auth & Helper Systems
// ========================================================================
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }
    const response = await fetch(url, {
        ...options,
        headers
    });
    if (response.status === 401) {
        handleLogout();
        showToast("Session expired. Please sign in again.");
        throw new Error("Unauthorized access");
    }
    return response;
}

function openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
        toggleAuthMode('login');
    }
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
    }
}

function toggleAuthMode(mode, event) {
    if (event) event.preventDefault();
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const title = document.getElementById("auth-modal-title");
    const subtitle = document.getElementById("auth-modal-subtitle");
    
    if (mode === 'login') {
        if (loginForm) loginForm.style.display = "flex";
        if (registerForm) registerForm.style.display = "none";
        if (title) title.textContent = "Sign In";
        if (subtitle) subtitle.textContent = "Access your luxury beauty profile.";
    } else {
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "flex";
        if (title) title.textContent = "Register Account";
        if (subtitle) subtitle.textContent = "Create your luxury salon discovery profile.";
    }
}

async function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (data.success) {
            AUTH_TOKEN = data.token;
            CURRENT_USER = data.user;
            localStorage.setItem("bee-token", AUTH_TOKEN);
            localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
            
            APP_STATE.wishlist = CURRENT_USER.favorites ? CURRENT_USER.favorites.map(f => typeof f === 'object' ? f._id : f) : [];
            document.getElementById("nav-wishlist-count").textContent = APP_STATE.wishlist.length;
            
            updateNavbarAuth();
            closeAuthModal();
            showToast(`Welcome back, ${CURRENT_USER.name}!`);
            
            navigateTo("dashboard");
        } else {
            showToast(data.message || "Invalid credentials. Please try again.");
        }
    } catch (err) {
        console.error("Login error:", err);
        showToast("An error occurred during sign in.");
    }
}

async function handleRegisterSubmit(event) {
    if (event) event.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const phone = document.getElementById("register-phone").value;
    const password = document.getElementById("register-password").value;
    const role = document.getElementById("register-role").value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role })
        });
        const data = await response.json();
        
        if (data.success) {
            AUTH_TOKEN = data.token;
            CURRENT_USER = data.user;
            localStorage.setItem("bee-token", AUTH_TOKEN);
            localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
            
            APP_STATE.wishlist = [];
            document.getElementById("nav-wishlist-count").textContent = 0;
            
            updateNavbarAuth();
            closeAuthModal();
            showToast("Registration successful! Welcome to Bee.");
            
            navigateTo("dashboard");
        } else {
            showToast(data.message || "Registration failed. Please try again.");
        }
    } catch (err) {
        console.error("Registration error:", err);
        showToast("An error occurred during registration.");
    }
}

function handleLogout() {
    AUTH_TOKEN = null;
    CURRENT_USER = null;
    localStorage.removeItem("bee-token");
    localStorage.removeItem("bee-user");
    
    APP_STATE.wishlist = [];
    document.getElementById("nav-wishlist-count").textContent = 0;
    
    updateNavbarAuth();
    navigateTo("home");
    showToast("Signed out successfully.");
}

function updateNavbarAuth() {
    const container = document.getElementById("nav-auth-container");
    if (!container) return;
    
    if (AUTH_TOKEN && CURRENT_USER) {
        container.innerHTML = `
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-gold);">Hello, ${CURRENT_USER.name}</span>
            <button onclick="handleLogout()" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem; border-radius: 4px;">Sign Out</button>
        `;
        document.querySelectorAll(".nav-link").forEach(link => {
            if (link.getAttribute("href") === "#dashboard") {
                link.style.display = "block";
            }
        });
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal()" class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.8rem; border-radius: 4px;">Sign In</button>
        `;
        document.querySelectorAll(".nav-link").forEach(link => {
            if (link.getAttribute("href") === "#dashboard") {
                link.style.display = "none";
            }
        });
    }
}

async function fetchSalons() {
    try {
        let url = '/api/salons?';
        const params = [];
        
        if (APP_STATE.filterParams.locations && APP_STATE.filterParams.locations.length > 0) {
            params.push(`locations=${APP_STATE.filterParams.locations.join(',')}`);
        }
        if (APP_STATE.filterParams.categories && APP_STATE.filterParams.categories.length > 0) {
            params.push(`categories=${APP_STATE.filterParams.categories.join(',')}`);
        }
        if (APP_STATE.filterParams.prices && APP_STATE.filterParams.prices.length > 0) {
            params.push(`priceRanges=${APP_STATE.filterParams.prices.join(',')}`);
        }
        if (APP_STATE.filterParams.minRating > 0) {
            params.push(`minRating=${APP_STATE.filterParams.minRating}`);
        }
        if (APP_STATE.filterParams.sort) {
            params.push(`sort=${APP_STATE.filterParams.sort}`);
        }
        if (APP_STATE.searchParams.query) {
            params.push(`search=${encodeURIComponent(APP_STATE.searchParams.query)}`);
        }
        
        const res = await fetch(url + params.join('&'));
        const data = await res.json();
        if (data.success) {
            SALONS_DB = data.salons;
            SALONS_DB.forEach(salon => {
                salon.id = salon._id;
                if (salon.services) {
                    salon.services.forEach(serv => {
                        serv.id = serv._id;
                    });
                }
            });
        }
    } catch (err) {
        console.error("Error fetching salons:", err);
    }
}

async function initApp() {
    await fetchSalons();
    if (APP_STATE.activePage === "home") {
        renderFeaturedSalons();
    } else if (APP_STATE.activePage === "listings") {
        renderListingScreen();
    }
    updateNavbarAuth();
}

async function renderCustomerOverview() {
    const nextBookingContainer = document.getElementById("dashboard-next-booking");
    const pastBookingsList = document.getElementById("dashboard-bookings-list");
    const wishlistGrid = document.getElementById("dashboard-saved-grid");
    
    const pointsIndicator = document.getElementById("dashboard-points-indicator");
    if (pointsIndicator) pointsIndicator.textContent = CURRENT_USER.role === 'Admin' ? 'N/A' : '2,450';
    
    let bookings = [];
    try {
        const res = await apiFetch('/api/bookings/my-bookings');
        const data = await res.json();
        if (data.success) {
            bookings = data.bookings;
        }
    } catch (err) {
        console.error("Error fetching bookings:", err);
    }
    
    const activeBooking = bookings.find(b => b.status === 'Pending' || b.status === 'Confirmed');
    if (!activeBooking || !nextBookingContainer) {
        if (nextBookingContainer) {
            nextBookingContainer.innerHTML = `
                <div class="glass" style="padding:2.5rem; border-radius:var(--border-radius-lg); text-align:center;">
                    <i class="far fa-calendar-times" style="font-size: 2.5rem; color: var(--color-gold); margin-bottom: 1rem;"></i>
                    <h4>No Upcoming Reservations</h4>
                    <p style="color:var(--color-text-muted); margin-top:0.5rem; font-size:0.85rem;">Secure your next beauty escape on our explore panel.</p>
                    <button onclick="navigateTo('listings')" class="btn btn-primary" style="margin-top:1.5rem; padding: 0.7rem 1.8rem;">Explore Salons</button>
                </div>
            `;
        }
    } else {
        const formattedDate = new Date(activeBooking.appointmentDate).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const servicesNames = activeBooking.services.map(s => s.name).join(", ");
        nextBookingContainer.innerHTML = `
            <div class="dashboard-pass-card glass animate-fade">
                <div class="pass-details">
                    <span class="elite-badge" style="width:fit-content; margin-bottom:0.5rem; font-size:0.6rem;">VIP Entrance Pass</span>
                    <h3 style="margin-bottom:0.2rem;">${activeBooking.salon.name}</h3>
                    <p style="font-size:0.85rem; color:var(--color-muted);"><i class="fas fa-map-marker-alt"></i> ${activeBooking.salon.neighborhood}</p>
                    
                    <div style="margin-top: 1rem; font-size: 0.9rem;">
                        <strong>Services Reserved:</strong> ${servicesNames}<br>
                        <strong>Schedule:</strong> ${formattedDate} at ${activeBooking.timeSlot}
                    </div>
                    
                    <div style="margin-top: 1rem; font-size: 0.9rem; font-weight: 600; color: var(--color-gold);">
                        Status: ${activeBooking.status}
                    </div>
                </div>
                
                <div style="display:flex; flex-direction:column; align-items:center; gap:0.5rem;">
                    <div class="pass-qrcode">
                        <div style="width:100%; height:100%; display:grid; grid-template-columns: repeat(4, 1fr); gap:2px; background:#1A120B; padding:4px;">
                            <div style="background:#fff;"></div><div style="background:#fff;"></div><div style="background:#1A120B;"></div><div style="background:#fff;"></div>
                            <div style="background:#1A120B;"></div><div style="background:#fff;"></div><div style="background:#fff;"></div><div style="background:#1A120B;"></div>
                            <div style="background:#fff;"></div><div style="background:#1A120B;"></div><div style="background:#fff;"></div><div style="background:#fff;"></div>
                            <div style="background:#fff;"></div><div style="background:#fff;"></div><div style="background:#1A120B;"></div><div style="background:#fff;"></div>
                        </div>
                    </div>
                    <span style="font-family:monospace; font-size:0.75rem; color:var(--color-gold); font-weight:700;">${activeBooking._id.substring(activeBooking._id.length - 8).toUpperCase()}</span>
                </div>
            </div>
        `;
    }
    
    if (wishlistGrid) {
        wishlistGrid.innerHTML = "";
        let favorites = [];
        try {
            const res = await apiFetch('/api/users/profile');
            const data = await res.json();
            if (data.success) {
                favorites = data.user.favorites || [];
                CURRENT_USER.favorites = favorites;
                localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
                APP_STATE.wishlist = favorites.map(f => f._id);
                document.getElementById("nav-wishlist-count").textContent = APP_STATE.wishlist.length;
            }
        } catch (err) {
            console.error("Error syncing favorites:", err);
            favorites = CURRENT_USER.favorites || [];
        }
        
        if (favorites.length === 0) {
            wishlistGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--color-muted); font-size:0.85rem;">
                    Your collection wishlist is currently empty.
                </div>
            `;
        } else {
            favorites.forEach(salon => {
                wishlistGrid.insertAdjacentHTML("beforeend", `
                    <div class="glass" style="display:flex; gap:1.2rem; padding:1rem; border-radius:var(--border-radius-lg); align-items:center;">
                        <img src="${salon.images[0]}" alt="${salon.name}" style="width:80px; height:80px; object-fit:cover; border-radius:6px;">
                        <div style="flex-grow:1;">
                            <h5 style="margin-bottom:0.2rem; font-size:1.05rem;">${salon.name}</h5>
                            <span style="font-size:0.75rem; color:var(--color-muted);"><i class="fas fa-map-marker-alt"></i> ${salon.neighborhood}</span>
                            <div style="margin-top:0.4rem;">
                                <a href="#details/${salon._id}" style="font-size:0.75rem; color:var(--color-gold); font-weight:600;">Visit Salon</a>
                            </div>
                        </div>
                        <button class="wishlist-btn active" style="position:static; margin-left:auto; transform:none;" onclick="toggleWishlist('${salon._id}', event)">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                `);
            });
        }
    }
    
    if (pastBookingsList) {
        pastBookingsList.innerHTML = "";
        if (bookings.length === 0) {
            pastBookingsList.innerHTML = `<li style="font-size:0.85rem; color:var(--color-muted);">No booking logs found.</li>`;
        } else {
            bookings.forEach(bk => {
                const formattedDate = new Date(bk.appointmentDate).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const servicesNames = bk.services.map(s => s.name).join(", ");
                let statusColor = 'var(--color-gold)';
                if (bk.status === 'Completed') statusColor = 'var(--color-success)';
                if (bk.status === 'Cancelled') statusColor = 'red';
                
                pastBookingsList.insertAdjacentHTML("beforeend", `
                    <li class="glass" style="display:flex; justify-content:space-between; align-items:center; padding:1.2rem; border-radius:var(--border-radius-md); margin-bottom:1rem; font-size:0.9rem;">
                        <div>
                            <span style="font-weight:600; color:var(--color-gold);">${bk.salon.name}</span>
                            <div style="font-size:0.75rem; color:var(--color-muted);">${formattedDate} | ${bk.timeSlot}</div>
                            <div style="font-size:0.75rem; color:var(--color-muted);">${servicesNames}</div>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-weight:700;">₹${bk.totalBill.toLocaleString("en-IN")}</span>
                            <div style="font-size:0.7rem; color:${statusColor}; font-weight:600;">${bk.status}</div>
                        </div>
                    </li>
                `);
            });
        }
    }
}

function populateProfileFormInputs() {
    const nameInput = document.getElementById("profile-name");
    const phoneInput = document.getElementById("profile-phone");
    const emailInput = document.getElementById("profile-email");
    const passwordInput = document.getElementById("profile-password");
    
    if (nameInput) nameInput.value = CURRENT_USER.name || "";
    if (phoneInput) phoneInput.value = CURRENT_USER.phone || "";
    if (emailInput) emailInput.value = CURRENT_USER.email || "";
    if (passwordInput) passwordInput.value = "";
}

async function renderOwnerSalonPane() {
    try {
        const res = await fetch('/api/salons?isAdminView=true');
        const data = await res.json();
        if (data.success) {
            SALONS_DB = data.salons;
            SALONS_DB.forEach(salon => {
                salon.id = salon._id;
                if (salon.services) {
                    salon.services.forEach(serv => {
                        serv.id = serv._id;
                    });
                }
            });
        }
    } catch (err) {
        console.error("Error pre-fetching salons:", err);
    }
    
    ACTIVE_OWNER_SALON = SALONS_DB.find(s => s.owner && (s.owner._id === CURRENT_USER._id || s.owner === CURRENT_USER._id));
    
    const form = document.getElementById("owner-salon-form");
    if (!form) return;
    
    if (!ACTIVE_OWNER_SALON) {
        form.innerHTML = `
            <h4 class="text-gold" style="margin-bottom: 1rem;">Register a New Luxury Salon</h4>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Salon Name</label>
                <input type="text" id="owner-salon-name" required placeholder="e.g. L'Oreal Professional Salon" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Tagline</label>
                <input type="text" id="owner-salon-tagline" required placeholder="e.g. The finest grooming experience." style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Neighborhood</label>
                <select id="owner-salon-neighborhood" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
                    <option value="Lavelle Road">Lavelle Road</option>
                    <option value="Koramangala">Koramangala</option>
                    <option value="Indiranagar">Indiranagar</option>
                    <option value="Sadashivanagar">Sadashivanagar</option>
                </select>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Full Address</label>
                <input type="text" id="owner-salon-address" required placeholder="e.g. 123 Main St, Bangalore" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Opening Hours</label>
                <input type="text" id="owner-salon-hours" placeholder="e.g. 10:00 AM - 08:30 PM" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                    <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Starting Price (₹)</label>
                    <input type="number" id="owner-salon-price-start" required placeholder="1500" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
                </div>
                <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                    <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Average Price (₹)</label>
                    <input type="number" id="owner-salon-price-avg" required placeholder="3500" style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main);">
                </div>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; text-align: left;">
                <label style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-gold); margin-bottom: 6px; font-weight: 700;">Salon Description</label>
                <textarea id="owner-salon-desc" required rows="4" placeholder="Brief details about the salon ambiance and specialists..." style="background: rgba(26,18,11,0.5); border: 1px solid var(--color-glass-border); padding: 0.8rem; border-radius: 6px; color: var(--color-text-main); font-family: var(--font-body); resize: none;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Register Salon</button>
        `;
        document.getElementById("owner-salon-services-list").innerHTML = `<div style="text-align: center; color: var(--color-muted); font-size: 0.85rem; padding: 2rem;">Please register your salon first.</div>`;
        return;
    }
    
    document.getElementById("owner-salon-name").value = ACTIVE_OWNER_SALON.name;
    document.getElementById("owner-salon-tagline").value = ACTIVE_OWNER_SALON.tagline;
    document.getElementById("owner-salon-neighborhood").value = ACTIVE_OWNER_SALON.neighborhood;
    document.getElementById("owner-salon-address").value = ACTIVE_OWNER_SALON.address;
    document.getElementById("owner-salon-hours").value = ACTIVE_OWNER_SALON.openingHours;
    document.getElementById("owner-salon-price-start").value = ACTIVE_OWNER_SALON.startingPrice;
    document.getElementById("owner-salon-price-avg").value = ACTIVE_OWNER_SALON.averagePrice;
    document.getElementById("owner-salon-desc").value = ACTIVE_OWNER_SALON.description;
    
    const servicesList = document.getElementById("owner-salon-services-list");
    if (servicesList) {
        servicesList.innerHTML = "";
        if (!ACTIVE_OWNER_SALON.services || ACTIVE_OWNER_SALON.services.length === 0) {
            servicesList.innerHTML = `<div style="text-align: center; color: var(--color-muted); font-size: 0.85rem; padding: 2rem;">No services registered yet. Add one below.</div>`;
        } else {
            ACTIVE_OWNER_SALON.services.forEach(serv => {
                servicesList.insertAdjacentHTML("beforeend", `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(255,255,255,0.03); border: 1px solid var(--color-glass-border); border-radius: 4px; font-size: 0.8rem;">
                        <div>
                            <strong>${serv.name}</strong> (${serv.duration})
                            <div style="font-size: 0.7rem; color: var(--color-muted);">${serv.description}</div>
                        </div>
                        <span style="font-weight: 700; color: var(--color-gold);">₹${serv.price}</span>
                    </div>
                `);
            });
        }
    }
}

async function handleOwnerSalonUpdate(event) {
    if (event) event.preventDefault();
    
    const name = document.getElementById("owner-salon-name").value;
    const tagline = document.getElementById("owner-salon-tagline").value;
    const neighborhood = document.getElementById("owner-salon-neighborhood").value;
    const address = document.getElementById("owner-salon-address").value;
    const hours = document.getElementById("owner-salon-hours").value;
    const startingPrice = parseInt(document.getElementById("owner-salon-price-start").value);
    const averagePrice = parseInt(document.getElementById("owner-salon-price-avg").value);
    const description = document.getElementById("owner-salon-desc").value;
    
    const payload = {
        name,
        tagline,
        neighborhood,
        address,
        openingHours: hours,
        startingPrice,
        averagePrice,
        premiumPrice: averagePrice,
        description,
        images: ACTIVE_OWNER_SALON ? ACTIVE_OWNER_SALON.images : [
            'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
        ]
    };
    
    try {
        let res, data;
        if (ACTIVE_OWNER_SALON) {
            res = await apiFetch(`/api/salons/${ACTIVE_OWNER_SALON._id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            res = await apiFetch('/api/salons', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        
        data = await res.json();
        if (data.success) {
            showToast(ACTIVE_OWNER_SALON ? "Salon updated successfully!" : "Salon registered successfully!");
            ACTIVE_OWNER_SALON = data.salon;
            renderOwnerSalonPane();
        } else {
            showToast(data.message || "Failed to save salon details.");
        }
    } catch (err) {
        console.error("Save salon error:", err);
        showToast("Error saving salon details.");
    }
}

async function handleOwnerAddService(event) {
    if (event) event.preventDefault();
    if (!ACTIVE_OWNER_SALON) {
        showToast("Please register your salon before adding services.");
        return;
    }
    
    const name = document.getElementById("add-service-name").value;
    const category = document.getElementById("add-service-category").value;
    const price = parseInt(document.getElementById("add-service-price").value);
    const duration = document.getElementById("add-service-duration").value;
    const description = document.getElementById("add-service-desc").value;
    
    const payload = {
        name,
        category,
        price,
        duration,
        description,
        salonId: ACTIVE_OWNER_SALON._id
    };
    
    try {
        const res = await apiFetch('/api/salons/services', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(`Service "${name}" added successfully!`);
            document.getElementById("add-service-name").value = "";
            document.getElementById("add-service-price").value = "";
            document.getElementById("add-service-duration").value = "";
            document.getElementById("add-service-desc").value = "";
            renderOwnerSalonPane();
        } else {
            showToast(data.message || "Failed to add service.");
        }
    } catch (err) {
        console.error("Add service error:", err);
        showToast("Error adding service.");
    }
}

async function renderOwnerBookingsPane() {
    const tableBody = document.getElementById("owner-bookings-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    try {
        const res = await apiFetch('/api/bookings/owner-bookings');
        const data = await res.json();
        
        if (data.success) {
            const bookings = data.bookings;
            if (bookings.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-muted);">No bookings found for your salon.</td>
                    </tr>
                `;
                return;
            }
            
            bookings.forEach(bk => {
                const formattedDate = new Date(bk.appointmentDate).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const servicesNames = bk.services.map(s => s.name).join(", ");
                
                let actionBtnHTML = "";
                if (bk.status === 'Pending') {
                    actionBtnHTML = `
                        <button onclick="updateBookingStatus('${bk._id}', 'Confirmed')" class="btn btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.75rem; border-radius: 4px; margin-right: 0.5rem;">Confirm</button>
                        <button onclick="updateBookingStatus('${bk._id}', 'Cancelled')" class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.75rem; border-radius: 4px;">Cancel</button>
                    `;
                } else if (bk.status === 'Confirmed') {
                    actionBtnHTML = `
                        <button onclick="updateBookingStatus('${bk._id}', 'Completed')" class="btn btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.75rem; border-radius: 4px;">Complete</button>
                    `;
                } else {
                    actionBtnHTML = `<span style="font-size: 0.75rem; color: var(--color-muted);">No Action</span>`;
                }
                
                tableBody.insertAdjacentHTML("beforeend", `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">
                            <strong>${bk.user.name}</strong><br>
                            <span style="font-size: 0.7rem; color: var(--color-muted);">${bk.user.phone}</span>
                        </td>
                        <td style="padding: 1rem;">${formattedDate}<br><span style="font-size: 0.75rem; color: var(--color-muted);">${bk.timeSlot}</span></td>
                        <td style="padding: 1rem; max-width: 250px;">${servicesNames}</td>
                        <td style="padding: 1rem; font-weight: 700; color: var(--color-gold);">₹${bk.totalBill.toLocaleString("en-IN")}</td>
                        <td style="padding: 1rem;">
                            <span style="font-size:0.75rem; font-weight:600; color:${bk.status === 'Completed' ? 'var(--color-success)' : bk.status === 'Cancelled' ? 'red' : 'var(--color-gold)'}">${bk.status}</span>
                        </td>
                        <td style="padding: 1rem; text-align: right;">${actionBtnHTML}</td>
                    </tr>
                `);
            });
        }
    } catch (err) {
        console.error("Error fetching owner bookings:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: red;">Error fetching bookings.</td></tr>`;
    }
}

async function updateBookingStatus(bookingId, status) {
    try {
        const res = await apiFetch(`/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Booking ${status.toLowerCase()} successfully.`);
            renderOwnerBookingsPane();
        } else {
            showToast(data.message || "Failed to update booking status.");
        }
    } catch (err) {
        console.error("Update status error:", err);
        showToast("Error updating booking status.");
    }
}

async function renderAdminApprovalsPane() {
    const tableBody = document.getElementById("admin-salons-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    try {
        const res = await apiFetch('/api/salons?isAdminView=true');
        const data = await res.json();
        
        if (data.success) {
            const salons = data.salons;
            if (salons.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-muted);">No salons found in database.</td>
                    </tr>
                `;
                return;
            }
            
            salons.forEach(salon => {
                const ownerName = salon.owner && salon.owner.name ? salon.owner.name : "Unknown Owner";
                const ownerContact = salon.owner && salon.owner.email ? salon.owner.email : "";
                
                tableBody.insertAdjacentHTML("beforeend", `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;"><strong>${salon.name}</strong></td>
                        <td style="padding: 1rem;">${salon.neighborhood}</td>
                        <td style="padding: 1rem;">
                            ${ownerName}<br>
                            <span style="font-size: 0.75rem; color: var(--color-muted);">${ownerContact}</span>
                        </td>
                        <td style="padding: 1rem;"><span class="salon-badge" style="position: static;">${salon.luxuryBadge}</span></td>
                        <td style="padding: 1rem; font-weight: 700; color: var(--color-gold);">₹${salon.startingPrice}</td>
                        <td style="padding: 1rem;">
                            <span style="font-weight: 600; color: ${salon.isApproved ? 'var(--color-success)' : 'var(--color-gold)'}">
                                ${salon.isApproved ? 'Approved' : 'Pending'}
                            </span>
                        </td>
                        <td style="padding: 1rem; text-align: right;">
                            <button onclick="toggleSalonApprovalState('${salon._id}')" class="btn ${salon.isApproved ? 'btn-secondary' : 'btn-primary'}" style="padding: 0.3rem 0.8rem; font-size: 0.75rem; border-radius: 4px;">
                                ${salon.isApproved ? 'Disapprove' : 'Approve'}
                            </button>
                        </td>
                    </tr>
                `);
            });
        }
    } catch (err) {
        console.error("Error fetching salons for admin approvals:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: red;">Error fetching salons.</td></tr>`;
    }
}

async function toggleSalonApprovalState(salonId) {
    try {
        const res = await apiFetch(`/api/salons/${salonId}/approve`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            renderAdminApprovalsPane();
        } else {
            showToast(data.message || "Failed to update salon approval state.");
        }
    } catch (err) {
        console.error("Toggle approval error:", err);
        showToast("Error updating salon approval state.");
    }
}

async function renderAdminAnalyticsPane() {
    const totalUsersDOM = document.getElementById("admin-total-users");
    const revenueDOM = document.getElementById("admin-revenue");
    const totalSalonsDOM = document.getElementById("admin-total-salons");
    const usersTableBody = document.getElementById("admin-users-table-body");
    
    try {
        const res = await apiFetch('/api/salons/admin/analytics');
        const data = await res.json();
        if (data.success) {
            const stats = data.analytics;
            if (totalUsersDOM) totalUsersDOM.textContent = stats.totalUsers;
            if (revenueDOM) revenueDOM.textContent = `₹${stats.revenue.toLocaleString("en-IN")}`;
            if (totalSalonsDOM) totalSalonsDOM.textContent = stats.totalSalons;
        }
    } catch (err) {
        console.error("Error loading admin analytics:", err);
    }
    
    if (usersTableBody) {
        usersTableBody.innerHTML = "";
        try {
            const res = await apiFetch('/api/users');
            const data = await res.json();
            if (data.success) {
                const users = data.users;
                if (users.length === 0) {
                    usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-muted);">No users registered.</td></tr>`;
                    return;
                }
                users.forEach(u => {
                    const plan = u.membership && u.membership.plan ? u.membership.plan : "None";
                    usersTableBody.insertAdjacentHTML("beforeend", `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem; display: flex; align-items: center; gap: 0.8rem;">
                                <img src="${u.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=30&h=30'}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                <span><strong>${u.name}</strong></span>
                            </td>
                            <td style="padding: 1rem;">${u.email}</td>
                            <td style="padding: 1rem;">${u.phone}</td>
                            <td style="padding: 1rem;"><span class="salon-badge" style="position: static;">${u.role}</span></td>
                            <td style="padding: 1rem; color: var(--color-gold); font-weight: 600;">${plan}</td>
                        </tr>
                    `);
                });
            }
        } catch (err) {
            console.error("Error loading user list:", err);
            usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: red;">Error loading users.</td></tr>`;
        }
    }
}

async function handleSubscribe(plan) {
    if (!AUTH_TOKEN) {
        openAuthModal();
        showToast("Please sign in to join Bee Elite.");
        return;
    }
    
    try {
        const res = await apiFetch('/api/users/subscribe', {
            method: 'POST',
            body: JSON.stringify({ plan })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            CURRENT_USER.membership = data.membership;
            localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
            if (APP_STATE.activePage === 'dashboard') {
                renderDashboardScreen();
            }
        } else {
            showToast(data.message || "Subscription failed.");
        }
    } catch (err) {
        console.error("Subscription error:", err);
        showToast("Error joining Bee Elite.");
    }
}

async function handleUserProfileUpdate(event) {
    if (event) event.preventDefault();
    const name = document.getElementById("profile-name").value;
    const phone = document.getElementById("profile-phone").value;
    const password = document.getElementById("profile-password").value;
    
    const updateData = { name, phone };
    if (password) {
        updateData.password = password;
    }
    
    try {
        const res = await apiFetch('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        const data = await res.json();
        if (data.success) {
            CURRENT_USER = data.user;
            localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
            showToast("Profile settings updated successfully!");
            renderDashboardScreen();
        } else {
            showToast(data.message || "Failed to update profile.");
        }
    } catch (err) {
        console.error("Update profile error:", err);
        showToast("Error updating profile settings.");
    }
}

// ========================================================================
// 3. Navigation & Router System
// ========================================================================
function initRouter() {
    // Listen to hash changes
    window.addEventListener("hashchange", handleHashChange);
    // Initial page load routing
    handleHashChange();
}

async function handleHashChange() {
    const hash = window.location.hash || "#home";
    const pageId = hash.replace("#", "");
    
    // Parse complex paths (e.g. details/60d21b49f1b21213c4a259c4)
    if (pageId.startsWith("details/")) {
        const salonId = pageId.split("/")[1];
        let salon = SALONS_DB.find(s => s.id === salonId);
        if (salon) {
            APP_STATE.selectedSalon = salon;
            navigateToPage("salon-details");
        } else {
            try {
                const res = await fetch(`/api/salons/${salonId}`);
                const data = await res.json();
                if (data.success && data.salon) {
                    APP_STATE.selectedSalon = data.salon;
                    APP_STATE.selectedSalon.id = data.salon._id;
                    if (APP_STATE.selectedSalon.services) {
                        APP_STATE.selectedSalon.services.forEach(s => s.id = s._id);
                    }
                    APP_STATE.selectedSalon.reviews = data.reviews || [];
                    navigateToPage("salon-details");
                } else {
                    window.location.hash = "#home";
                }
            } catch (err) {
                console.error("Error retrieving salon details:", err);
                window.location.hash = "#home";
            }
        }
    } else {
        navigateToPage(pageId);
    }
}

function navigateToPage(pageId) {
    if (pageId === "dashboard" && !AUTH_TOKEN) {
        window.location.hash = "#home";
        openAuthModal();
        showToast("Please sign in to access your dashboard.");
        return;
    }
    APP_STATE.activePage = pageId;
    
    // Update active visual navigation links
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${pageId}`) {
            link.classList.add("active");
        }
    });

    // Hide all view screens
    document.querySelectorAll(".view-pane").forEach(pane => {
        pane.style.display = "none";
        pane.classList.remove("animate-fade");
    });

    // Show selected pane
    const activePane = document.getElementById(`${pageId}-page`);
    if (activePane) {
        activePane.style.display = "block";
        activePane.classList.add("animate-fade");
        window.scrollTo(0, 0);
    }

    // Trigger page-specific initializations
    if (pageId === "home") {
        renderFeaturedSalons();
    } else if (pageId === "listings") {
        renderListingScreen();
    } else if (pageId === "salon-details") {
        renderSalonDetailsScreen();
    } else if (pageId === "dashboard") {
        renderDashboardScreen();
    } else if (pageId === "elite") {
        initElitePageEvents();
    }
}

// Helper to push state
function navigateTo(hash) {
    window.location.hash = hash;
}

// ========================================================================
// 4. Interface Rendering: Homepage
// ========================================================================
function renderFeaturedSalons() {
    const featuredGrid = document.getElementById("featured-salon-grid");
    if (!featuredGrid) return;

    featuredGrid.innerHTML = "";
    
    // Showcase top 3 salons on homepage
    SALONS_DB.slice(0, 3).forEach(salon => {
        const isSaved = APP_STATE.wishlist.includes(salon.id);
        
        const priceHTML = `
            <div class="salon-card-price" style="font-size: 0.82rem; display: flex; flex-direction: column; line-height: 1.3;">
                <span style="font-weight: 700; color: var(--color-text-main);">Starting from <span style="color: var(--color-gold);">₹${salon.startingPrice.toLocaleString("en-IN")}</span></span>
                <span style="font-size: 0.7rem; color: var(--color-muted); font-weight: 500;">Avg Package: ₹${salon.averagePrice.toLocaleString("en-IN")}</span>
            </div>
        `;
        
        const cardHTML = `
            <div class="salon-card glass">
                <div class="card-reflection"></div>
                <div class="salon-card-img-wrapper">
                    <span class="salon-badge">${salon.luxuryBadge}</span>
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist('${salon.id}', event)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <img class="salon-card-img" src="${salon.images[0]}" alt="${salon.name}">
                    <div class="salon-card-overlay"></div>
                </div>
                <div class="salon-card-content">
                    <div class="salon-card-header">
                        <h4 class="salon-card-title">${salon.name}</h4>
                        <div class="salon-card-rating">
                            <i class="fas fa-star"></i>
                            <span>${salon.rating}</span>
                        </div>
                    </div>
                    <div class="salon-card-location">
                        <i class="fas fa-map-marker-alt text-gold"></i>
                        <span>${salon.neighborhood}</span>
                    </div>
                    <p class="salon-card-desc font-body" style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1.5rem;">
                        ${salon.tagline}
                    </p>
                    <div class="salon-card-meta">
                        ${priceHTML}
                        <a href="#details/${salon.id}" class="btn-text">View Experiences <i class="fas fa-chevron-right" style="font-size:0.8rem;"></i></a>
                    </div>
                </div>
            </div>
        `;
        featuredGrid.insertAdjacentHTML("beforeend", cardHTML);
    });
    bindInteractive3D();
}

function handleHeroSearch(event) {
    if (event) event.preventDefault();
    
    const locVal = document.getElementById("search-location").value;
    const servVal = document.getElementById("search-service").value;
    const priceVal = document.getElementById("search-price").value;

    APP_STATE.filterParams.locations = locVal !== "all" ? [locVal] : [];
    APP_STATE.filterParams.categories = servVal !== "all" ? [servVal] : [];
    APP_STATE.filterParams.prices = priceVal !== "all" ? [parseInt(priceVal)] : [];
    
    // Navigate to listings
    navigateTo("listings");
}

// ========================================================================
// 5. Interface Rendering: Salon Listings & Filters
// ========================================================================
async function renderListingScreen() {
    const listGrid = document.getElementById("listings-grid");
    const countText = document.getElementById("listings-count");
    if (!listGrid) return;

    // Fetch filtered salons from backend
    await fetchSalons();

    let filtered = [...SALONS_DB];

    // Sort Salons based on starting price
    if (APP_STATE.filterParams.sort === "price-low") {
        filtered.sort((a, b) => a.startingPrice - b.startingPrice);
    } else if (APP_STATE.filterParams.sort === "price-high") {
        filtered.sort((a, b) => b.startingPrice - a.startingPrice);
    } else if (APP_STATE.filterParams.sort === "rating") {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    // Update count text
    countText.textContent = `${filtered.length} Exclusive Salon${filtered.length !== 1 ? 's' : ''} in Bangalore`;

    listGrid.innerHTML = "";
    
    if (filtered.length === 0) {
        listGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;" class="glass">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--color-gold); margin-bottom: 1.5rem;"></i>
                <h4 style="margin-bottom: 0.5rem;">No Salons Match Your Filters</h4>
                <p style="color: var(--color-text-muted);">Adjust your criteria or browse all salons.</p>
                <button onclick="resetFilters()" class="btn btn-secondary" style="margin-top: 1.5rem;">Reset All Filters</button>
            </div>
        `;
        return;
    }

    filtered.forEach(salon => {
        const isSaved = APP_STATE.wishlist.includes(salon.id);
        
        const priceHTML = `
            <div class="salon-card-price" style="font-size: 0.82rem; display: flex; flex-direction: column; line-height: 1.3;">
                <span style="font-weight: 700; color: var(--color-text-main);">Starting from <span style="color: var(--color-gold);">₹${salon.startingPrice.toLocaleString("en-IN")}</span></span>
                <span style="font-size: 0.7rem; color: var(--color-muted); font-weight: 500;">Avg Package: ₹${salon.averagePrice.toLocaleString("en-IN")}</span>
            </div>
        `;
        
        const cardHTML = `
            <div class="salon-card glass animate-fade">
                <div class="card-reflection"></div>
                <div class="salon-card-img-wrapper">
                    <span class="salon-badge">${salon.luxuryBadge}</span>
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist('${salon.id}', event)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <img class="salon-card-img" src="${salon.images[0]}" alt="${salon.name}">
                    <div class="salon-card-overlay"></div>
                </div>
                <div class="salon-card-content">
                    <div class="salon-card-header">
                        <h4 class="salon-card-title">${salon.name}</h4>
                        <div class="salon-card-rating">
                            <i class="fas fa-star"></i>
                            <span>${salon.rating}</span>
                        </div>
                    </div>
                    <div class="salon-card-location">
                        <i class="fas fa-map-marker-alt text-gold"></i>
                        <span>${salon.neighborhood}</span>
                    </div>
                    <p class="salon-card-desc" style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1.5rem;">
                        ${salon.tagline}
                    </p>
                    <div class="salon-card-meta">
                        ${priceHTML}
                        <a href="#details/${salon.id}" class="btn-text">Explore Experiences <i class="fas fa-chevron-right" style="font-size:0.8rem;"></i></a>
                    </div>
                </div>
            </div>
        `;
        listGrid.insertAdjacentHTML("beforeend", cardHTML);
    });

    // Synchronize UI Filter elements
    syncSidebarFilterInputs();
    bindInteractive3D();
}

function syncSidebarFilterInputs() {
    // Neighborhood checkboxes
    document.querySelectorAll(".loc-filter").forEach(cb => {
        cb.checked = APP_STATE.filterParams.locations.includes(cb.value);
    });
    // Category checkboxes
    document.querySelectorAll(".cat-filter").forEach(cb => {
        cb.checked = APP_STATE.filterParams.categories.includes(cb.value);
    });
    // Price checkboxes
    document.querySelectorAll(".price-filter").forEach(cb => {
        cb.checked = APP_STATE.filterParams.prices.includes(parseInt(cb.value));
    });
    // Sorting
    const sortSel = document.getElementById("sort-select");
    if (sortSel) sortSel.value = APP_STATE.filterParams.sort;
}

function handleFilterToggle(type, value, event) {
    if (type === "location") {
        if (event.target.checked) {
            APP_STATE.filterParams.locations.push(value);
        } else {
            APP_STATE.filterParams.locations = APP_STATE.filterParams.locations.filter(item => item !== value);
        }
    } else if (type === "category") {
        if (event.target.checked) {
            APP_STATE.filterParams.categories.push(value);
        } else {
            APP_STATE.filterParams.categories = APP_STATE.filterParams.categories.filter(item => item !== value);
        }
    } else if (type === "price") {
        const tier = parseInt(value);
        if (APP_STATE.filterParams.prices.includes(tier)) {
            APP_STATE.filterParams.prices = APP_STATE.filterParams.prices.filter(p => p !== tier);
        } else {
            APP_STATE.filterParams.prices.push(tier);
        }
    }
    renderListingScreen();
}

function handleSortChange(value) {
    APP_STATE.filterParams.sort = value;
    renderListingScreen();
}

function resetFilters() {
    APP_STATE.filterParams.locations = [];
    APP_STATE.filterParams.categories = [];
    APP_STATE.filterParams.prices = [];
    APP_STATE.filterParams.minRating = 0;
    APP_STATE.filterParams.sort = "recommended";
    renderListingScreen();
}

// ========================================================================
// 6. Interface Rendering: Salon Details
// ========================================================================
function renderSalonDetailsScreen() {
    const salon = APP_STATE.selectedSalon;
    if (!salon) return;

    // Set Salon Hero and Meta details
    document.getElementById("detail-hero-img").src = salon.images[0];
    document.getElementById("detail-badge").textContent = salon.luxuryBadge;
    document.getElementById("detail-salon-name").textContent = salon.name;
    document.getElementById("detail-rating-score").textContent = salon.rating;
    document.getElementById("detail-rating-count").textContent = `(${salon.ratingCount} reviews)`;
    document.getElementById("detail-salon-tagline").textContent = salon.tagline;
    document.getElementById("detail-salon-desc").textContent = salon.description;
    document.getElementById("detail-salon-loc").textContent = salon.neighborhood;

    // Load tabs - default to active 'services'
    switchDetailsTab("services");

    // Populate gallery tab
    const galleryContainer = document.getElementById("detail-gallery-tab");
    if (galleryContainer) {
        galleryContainer.innerHTML = salon.images.map(img => `
            <div class="gallery-item">
                <img src="${img}" alt="Salon View">
            </div>
        `).join("");
    }

    // Populate reviews tab
    const reviewsContainer = document.getElementById("detail-reviews-tab");
    if (reviewsContainer) {
        reviewsContainer.innerHTML = salon.reviews.map(rev => `
            <div class="testimonial-card glass" style="margin-bottom: 1.5rem;">
                <div class="testimonial-stars">
                    ${`<i class="fas fa-star"></i>`.repeat(Math.floor(rev.rating))}
                    ${rev.rating % 1 !== 0 ? `<i class="fas fa-star-half-alt"></i>` : ''}
                </div>
                <p class="testimonial-quote" style="margin-top: 1rem; margin-bottom: 1rem; font-size: 0.9rem;">"${rev.text}"</p>
                <div class="testimonial-author">
                    <div class="author-info">
                        <h5>${rev.name}</h5>
                        <span>Verified Guest • ${rev.date}</span>
                    </div>
                </div>
            </div>
        `).join("");
    }

    // Render Service Options in detail view
    renderDetailsServicesList();
    
    // Clear booking state on salon switch
    APP_STATE.bookingCart = [];
    updateBookingSummaryDOM();
}

function switchDetailsTab(tabName) {
    document.querySelectorAll(".details-tab-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabName) btn.classList.add("active");
    });

    document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
    });
    const selectedPane = document.getElementById(`detail-${tabName}-tab`);
    if (selectedPane) selectedPane.classList.add("active");
}

function renderDetailsServicesList() {
    const container = document.getElementById("detail-services-list");
    if (!container) return;

    const salon = APP_STATE.selectedSalon;
    container.innerHTML = "";

    salon.services.forEach(serv => {
        const isInCart = APP_STATE.bookingCart.some(item => item.id === serv.id);
        const rowHTML = `
            <div class="service-item-row glass">
                <div class="service-item-info">
                    <h4 class="service-item-name">${serv.name}</h4>
                    <div class="service-item-details">
                        <span><i class="far fa-clock text-gold"></i> ${serv.duration}</span>
                        <span><i class="fas fa-tag text-gold"></i> ${serv.category}</span>
                    </div>
                    <p class="service-item-desc">${serv.desc}</p>
                </div>
                <div class="service-item-action">
                    <span class="service-item-price">₹${serv.price.toLocaleString("en-IN")}</span>
                    <button class="btn ${isInCart ? 'btn-secondary' : 'btn-primary'}" 
                            style="padding: 0.6rem 1.4rem; border-radius: 4px;"
                            onclick="toggleServiceInCart(${serv.id})">
                        ${isInCart ? 'Remove' : 'Select'}
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", rowHTML);
    });
}

function toggleServiceInCart(serviceId) {
    const salon = APP_STATE.selectedSalon;
    if (!salon) return;

    const service = salon.services.find(s => s.id === serviceId);
    if (!service) return;

    const existingIndex = APP_STATE.bookingCart.findIndex(item => item.id === serviceId);

    if (existingIndex > -1) {
        APP_STATE.bookingCart.splice(existingIndex, 1);
        showToast(`Removed "${service.name}" from your booking selection.`);
    } else {
        APP_STATE.bookingCart.push(service);
        showToast(`Added "${service.name}" to your booking selection.`);
    }

    renderDetailsServicesList();
    updateBookingSummaryDOM();
}

function updateBookingSummaryDOM() {
    const listDOM = document.getElementById("summary-cart-items");
    const countDOM = document.getElementById("summary-cart-count");
    const subtotalDOM = document.getElementById("summary-subtotal");
    const serviceFeeDOM = document.getElementById("summary-service-fee");
    const totalDOM = document.getElementById("summary-total");
    const checkoutBtn = document.getElementById("summary-checkout-btn");

    if (!listDOM) return;

    listDOM.innerHTML = "";

    if (APP_STATE.bookingCart.length === 0) {
        listDOM.innerHTML = `<div style="text-align: center; color: var(--color-muted); font-size: 0.85rem; padding: 1.5rem 0;">No services selected yet.</div>`;
        countDOM.textContent = "(0)";
        subtotalDOM.textContent = "₹0";
        serviceFeeDOM.textContent = "₹0";
        totalDOM.textContent = "₹0";
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = 0.5;
        return;
    }

    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = 1;

    let subtotal = 0;
    APP_STATE.bookingCart.forEach(item => {
        subtotal += item.price;
        const itemHTML = `
            <div class="summary-item-bubble">
                <span style="font-weight:600; max-width:70%;">${item.name}</span>
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <span>₹${item.price.toLocaleString("en-IN")}</span>
                    <span class="summary-item-remove" onclick="toggleServiceInCart(${item.id})">Remove</span>
                </div>
            </div>
        `;
        listDOM.insertAdjacentHTML("beforeend", itemHTML);
    });

    const serviceFee = 250; // Premium concierge booking fee
    const total = subtotal + serviceFee;

    countDOM.textContent = `(${APP_STATE.bookingCart.length})`;
    subtotalDOM.textContent = `₹${subtotal.toLocaleString("en-IN")}`;
    serviceFeeDOM.textContent = `₹${serviceFee.toLocaleString("en-IN")}`;
    totalDOM.textContent = `₹${total.toLocaleString("en-IN")}`;
}

// ========================================================================
// 7. Multi-Step Booking Flow Modal Engine
// ========================================================================
function launchBookingFlow() {
    if (APP_STATE.bookingCart.length === 0) return;
    
    // Open Modal
    const modal = document.getElementById("global-booking-modal");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Reset Flow steps
    APP_STATE.bookingStep = 1;
    APP_STATE.bookingStylist = null;
    APP_STATE.bookingDate = null;
    APP_STATE.bookingSlot = null;

    renderBookingStepPane();
}

function closeBookingFlow() {
    const modal = document.getElementById("global-booking-modal");
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
}

function renderBookingStepPane() {
    // Update active step pane layout
    document.querySelectorAll(".booking-step-pane").forEach(pane => pane.classList.remove("active"));
    const activePane = document.getElementById(`booking-step-${APP_STATE.bookingStep}`);
    if (activePane) activePane.classList.add("active");

    // Update stepper tracker visual indicators
    document.querySelectorAll(".step-indicator").forEach((ind, index) => {
        const stepNum = index + 1;
        ind.classList.remove("active", "completed");
        if (stepNum === APP_STATE.bookingStep) {
            ind.classList.add("active");
        } else if (stepNum < APP_STATE.bookingStep) {
            ind.classList.add("completed");
        }
    });

    // Update dynamic Step Content
    if (APP_STATE.bookingStep === 1) {
        // Step 1: Booking overview list
        const reviewList = document.getElementById("step1-review-list");
        let subtotal = 0;
        reviewList.innerHTML = APP_STATE.bookingCart.map(item => {
            subtotal += item.price;
            return `
                <div class="service-item-row glass" style="padding: 1rem; margin-bottom: 0.8rem;">
                    <div>
                        <h5 style="margin-bottom:0.2rem;">${item.name}</h5>
                        <span style="font-size:0.75rem; color:var(--color-muted);"><i class="far fa-clock"></i> ${item.duration}</span>
                    </div>
                    <span style="font-weight:700; color:var(--color-gold);">₹${item.price.toLocaleString("en-IN")}</span>
                </div>
            `;
        }).join("");
        document.getElementById("step1-subtotal").textContent = `₹${subtotal.toLocaleString("en-IN")}`;
        document.getElementById("step1-total").textContent = `₹${(subtotal + 250).toLocaleString("en-IN")}`;
    } 
    else if (APP_STATE.bookingStep === 2) {
        // Step 2: Render Stylists
        renderStylistsSelection();
    } 
    else if (APP_STATE.bookingStep === 3) {
        // Step 3: Calendar and Slot widgets
        renderCalendarWidget();
        renderTimeSlots();
    }
    else if (APP_STATE.bookingStep === 4) {
        // Step 4: Final Invoice & checkout forms
        const checkoutList = document.getElementById("checkout-services-summary");
        let subtotal = 0;
        checkoutList.innerHTML = APP_STATE.bookingCart.map(item => {
            subtotal += item.price;
            return `<li>${item.name} (${item.duration})</li>`;
        }).join("");

        document.getElementById("checkout-stylist").textContent = APP_STATE.bookingStylist ? APP_STATE.bookingStylist.name : "Any Bee Elite Stylist";
        document.getElementById("checkout-date-time").textContent = `${APP_STATE.bookingDate} at ${APP_STATE.bookingSlot}`;
        document.getElementById("checkout-total-bill").textContent = `₹${(subtotal + 250).toLocaleString("en-IN")}`;
        
        // Link Credit Card preview inputs
        initCheckoutCardInputBindings();
    }

    // Toggle Back / Next buttons
    const prevBtn = document.getElementById("booking-prev-btn");
    const nextBtn = document.getElementById("booking-next-btn");

    if (APP_STATE.bookingStep === 1) {
        prevBtn.style.visibility = "hidden";
    } else {
        prevBtn.style.visibility = "visible";
    }

    if (APP_STATE.bookingStep === 4) {
        nextBtn.textContent = "Confirm Luxury Reservation";
        nextBtn.classList.add("btn-primary");
    } else {
        nextBtn.textContent = "Proceed";
        nextBtn.classList.remove("btn-primary");
    }
}

function handleBookingNext() {
    if (APP_STATE.bookingStep === 1) {
        APP_STATE.bookingStep = 2;
        renderBookingStepPane();
    } 
    else if (APP_STATE.bookingStep === 2) {
        // Stylist select check
        if (!APP_STATE.bookingStylist) {
            // Default select "Any Stylist" or first stylist
            APP_STATE.bookingStylist = STYLISTS_DB[0];
        }
        APP_STATE.bookingStep = 3;
        renderBookingStepPane();
    } 
    else if (APP_STATE.bookingStep === 3) {
        // Check date/time selected
        if (!APP_STATE.bookingDate || !APP_STATE.bookingSlot) {
            showToast("Please choose a preferred date and time slot.");
            return;
        }
        APP_STATE.bookingStep = 4;
        renderBookingStepPane();
    } 
    else if (APP_STATE.bookingStep === 4) {
        // Run payment validation and trigger reservation
        executeFinalReservation();
    }
}

function handleBookingPrev() {
    if (APP_STATE.bookingStep > 1) {
        APP_STATE.bookingStep -= 1;
        renderBookingStepPane();
    }
}

// Stylist lists rendering
function renderStylistsSelection() {
    const grid = document.getElementById("booking-stylists-grid");
    if (!grid) return;

    grid.innerHTML = "";

    STYLISTS_DB.forEach(sty => {
        const isSelected = APP_STATE.bookingStylist && APP_STATE.bookingStylist.name === sty.name;
        const card = `
            <div class="stylist-card glass ${isSelected ? 'active' : ''}" onclick="selectBookingStylist('${sty.name}')">
                <img class="stylist-img" src="${sty.img}" alt="${sty.name}">
                <h5 class="stylist-name">${sty.name}</h5>
                <span class="stylist-role">${sty.role}</span>
                <p style="font-size:0.7rem; color:var(--color-muted); margin-top:0.5rem;">Rating: ${sty.rating}</p>
            </div>
        `;
        grid.insertAdjacentHTML("beforeend", card);
    });
}

function selectBookingStylist(name) {
    const stylist = STYLISTS_DB.find(s => s.name === name);
    APP_STATE.bookingStylist = stylist;
    renderStylistsSelection();
}

// Calendar Picker Rendering
function renderCalendarWidget() {
    const grid = document.getElementById("calendar-days-container");
    if (!grid) return;

    grid.innerHTML = "";

    // Generate next 7 days starting tomorrow
    const daysArr = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + i);
        daysArr.push(futureDate);
    }

    daysArr.forEach(date => {
        const dayNum = date.getDate();
        const dateStr = date.toLocaleDateString("en-IN", { weekday: 'short' });
        const isoString = date.toISOString().split("T")[0];
        
        const isActive = APP_STATE.bookingDate === isoString;

        const dayBtn = `
            <button class="calendar-day-btn ${isActive ? 'active' : ''}" onclick="selectBookingDate('${isoString}')">
                <div style="font-weight:700;">${dayNum}</div>
                <div style="font-size:0.6rem; color:var(--color-muted); text-transform:uppercase;">${dateStr}</div>
            </button>
        `;
        grid.insertAdjacentHTML("beforeend", dayBtn);
    });
}

function selectBookingDate(isoDateString) {
    APP_STATE.bookingDate = isoDateString;
    renderCalendarWidget();
}

function renderTimeSlots() {
    const slotsGrid = document.getElementById("calendar-slots-container");
    if (!slotsGrid) return;

    slotsGrid.innerHTML = "";

    const slots = [
        "10:00 AM", "11:00 AM", "12:00 PM",
        "02:00 PM", "03:30 PM", "04:30 PM",
        "06:00 PM", "07:00 PM", "08:00 PM"
    ];

    slots.forEach(slot => {
        const isSelected = APP_STATE.bookingSlot === slot;
        const slotBtn = `
            <button class="slot-btn ${isSelected ? 'active' : ''}" onclick="selectBookingSlot('${slot}')">
                ${slot}
            </button>
        `;
        slotsGrid.insertAdjacentHTML("beforeend", slotBtn);
    });
}

function selectBookingSlot(slot) {
    APP_STATE.bookingSlot = slot;
    renderTimeSlots();
}

// Interactive Credit Card Form updates
function initCheckoutCardInputBindings() {
    const nameInp = document.getElementById("card-holder-name-input");
    const numInp = document.getElementById("card-number-input");
    const cardNameDOM = document.getElementById("cc-preview-name");
    const cardNumDOM = document.getElementById("cc-preview-number");
    
    if (nameInp && cardNameDOM) {
        nameInp.addEventListener("input", (e) => {
            cardNameDOM.textContent = e.target.value || "YOUR NAME";
        });
    }

    if (numInp && cardNumDOM) {
        numInp.addEventListener("input", (e) => {
            // Mask and format card number
            let value = e.target.value.replace(/\D/g, '');
            let matches = value.match(/\d{4,16}/g);
            let match = matches && matches[0] || '';
            let parts = [];

            for (let i=0, len=match.length; i<len; i+=4) {
                parts.push(match.substring(i, i+4));
            }

            if (parts.length > 0) {
                e.target.value = parts.join(' ');
                cardNumDOM.textContent = parts.join(' ');
            } else {
                e.target.value = value;
                cardNumDOM.textContent = value || "•••• •••• •••• ••••";
            }
        });
    }
}

async function executeFinalReservation() {
    if (!AUTH_TOKEN) {
        showToast("Please sign in to confirm your booking.");
        openAuthModal();
        return;
    }
    
    const subtotal = APP_STATE.bookingCart.reduce((sum, s) => sum + s.price, 0);
    const conciergeFee = 250;
    const totalBill = subtotal + conciergeFee;
    
    const payload = {
        salonId: APP_STATE.selectedSalon._id,
        services: APP_STATE.bookingCart.map(s => s._id),
        appointmentDate: APP_STATE.bookingDate,
        timeSlot: APP_STATE.bookingSlot,
        totalBill
    };
    
    try {
        const res = await apiFetch('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            const booking = data.booking;
            
            APP_STATE.bookingCart = [];
            updateBookingSummaryDOM();
            renderDetailsServicesList();
            
            const body = document.querySelector(".booking-modal-body");
            const footer = document.querySelector(".booking-modal-footer");
            
            const bookingPassId = booking._id.substring(booking._id.length - 8).toUpperCase();
            const formattedDate = new Date(booking.appointmentDate).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            
            if (body) {
                body.innerHTML = `
                    <div style="text-align:center; padding: 4rem 1.5rem;" class="animate-fade">
                        <div style="width: 80px; height: 80px; border-radius:50%; background:rgba(212,175,55,0.1); border: 2px solid var(--color-gold); display:flex; align-items:center; justify-content:center; margin: 0 auto 2rem; position:relative;">
                            <i class="fas fa-check" style="font-size:2.5rem; color:var(--color-gold);"></i>
                        </div>
                        <h2 class="text-gold" style="font-size: 2.2rem; margin-bottom: 1rem;">Experience Reserved</h2>
                        <p style="color: var(--color-text-muted); font-size:1.05rem; max-width:550px; margin: 0 auto 1.5rem;">
                            Your luxury booking pass is secured. A confirmation email and a VIP pass have been loaded to your profile dashboard.
                        </p>
                        <div class="glass" style="max-width:400px; margin: 0 auto 2.5rem; padding: 1.5rem; border-radius: var(--border-radius-lg); text-align:left;">
                            <h5 style="color:var(--color-gold); margin-bottom:0.8rem; text-transform:uppercase; font-size:0.75rem; letter-spacing:0.08em;">Reservation Summary</h5>
                            <div style="font-size:0.9rem; margin-bottom:0.5rem;"><strong>Salon:</strong> ${APP_STATE.selectedSalon.name}</div>
                            <div style="font-size:0.9rem; margin-bottom:0.5rem;"><strong>Date:</strong> ${formattedDate} at ${booking.timeSlot}</div>
                            <div style="font-size:0.9rem; margin-bottom:0.5rem;"><strong>Concierge Pass:</strong> ${bookingPassId}</div>
                        </div>
                        <button onclick="navigateToDashboardFromBooking()" class="btn btn-primary">Go to Dashboard</button>
                    </div>
                `;
            }
        
            if (footer) {
                footer.style.display = "none";
            }
        
            showToast("Luxury reservation confirmed successfully!");
        } else {
            showToast(data.message || "Failed to make reservation.");
        }
    } catch (err) {
        console.error("Booking reservation error:", err);
        showToast("Error making luxury reservation.");
    }
}

function navigateToDashboardFromBooking() {
    closeBookingFlow();
    
    // Delay routing slightly to look smooth
    setTimeout(() => {
        navigateTo("dashboard");
        
        // Restore standard booking modal layout for next sessions
        restoreBookingModalLayout();
    }, 400);
}

function restoreBookingModalLayout() {
    const modalContent = document.querySelector(".booking-modal-content");
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="booking-modal-header">
                <div>
                    <h3 class="text-gold" style="margin-bottom:0.3rem;">Bespoke Reservation</h3>
                    <p style="font-size:0.75rem; color:var(--color-text-muted); margin:0;">Complete your premium appointment booking details.</p>
                </div>
                <button class="booking-close" onclick="closeBookingFlow()"><i class="fas fa-times"></i></button>
            </div>

            <!-- Stepper Progress Tracker -->
            <div class="booking-stepper">
                <div class="step-indicator active">
                    <div class="step-dot">1</div>
                    <div class="step-label">Overview</div>
                </div>
                <div class="step-indicator">
                    <div class="step-dot">2</div>
                    <div class="step-label">Stylist</div>
                </div>
                <div class="step-indicator">
                    <div class="step-dot">3</div>
                    <div class="step-label">DateTime</div>
                </div>
                <div class="step-indicator">
                    <div class="step-dot">4</div>
                    <div class="step-label">Checkout</div>
                </div>
            </div>

            <!-- Scrollable Content Panes -->
            <div class="booking-modal-body">
                <!-- STEP 1 -->
                <div id="booking-step-1" class="booking-step-pane active">
                    <h4 style="margin-bottom: 1.5rem;">Verify Selected Services</h4>
                    <div id="step1-review-list" class="booking-reviews-scroller" style="max-height: 250px; overflow-y:auto; margin-bottom: 2rem;">
                        <!-- Populate dynamically -->
                    </div>
                    <div class="glass" style="padding: 1.5rem; border-radius: var(--border-radius-lg);">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.6rem; font-size: 0.9rem;">
                            <span>Subtotal</span>
                            <span id="step1-subtotal">₹0</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.6rem; font-size: 0.9rem;">
                            <span>Bee Concierge Fee</span>
                            <span>₹250</span>
                        </div>
                        <hr style="border:none; border-top: 1px solid var(--color-glass-border); margin: 0.8rem 0;">
                        <div style="display:flex; justify-content:space-between; font-size: 1.15rem; font-weight:700; color:var(--color-gold);">
                            <span>Total Bill</span>
                            <span id="step1-total">₹0</span>
                        </div>
                    </div>
                </div>

                <!-- STEP 2 -->
                <div id="booking-step-2" class="booking-step-pane">
                    <h4 style="margin-bottom: 0.5rem;">Select Your Stylist</h4>
                    <p style="font-size:0.8rem; color:var(--color-muted); margin-bottom:2rem;">Choose from our network of award-winning global fashion directors.</p>
                    <div id="booking-stylists-grid" class="stylist-grid">
                        <!-- Populate dynamically -->
                    </div>
                </div>

                <!-- STEP 3 -->
                <div id="booking-step-3" class="booking-step-pane">
                    <h4 style="margin-bottom: 1.5rem;">Schedule Date & Time</h4>
                    <div class="calendar-widget">
                        <div>
                            <div class="calendar-header-label">Preferred Date</div>
                            <div id="calendar-days-container" class="calendar-days-grid">
                                <!-- Days items populate dynamically -->
                            </div>
                        </div>
                        <div>
                            <div class="calendar-header-label">Available Slots</div>
                            <div id="calendar-slots-container" class="slots-grid">
                                <!-- Slots populate dynamically -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 4 -->
                <div id="booking-step-4" class="booking-step-pane">
                    <div class="checkout-layout">
                        <!-- Card visual side -->
                        <div class="credit-card-frame">
                            <div class="credit-card-preview" id="cc-card-model">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <div style="font-family:var(--font-heading); font-size:1.5rem; letter-spacing:0.05em; color:var(--color-gold);">Bee</div>
                                    <div class="card-chip" style="width:40px; height:28px;"></div>
                                </div>
                                <div class="card-number" id="cc-preview-number" style="font-size:1rem; margin-top:2rem;">•••• •••• •••• ••••</div>
                                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                                    <div class="card-holder">
                                        <label>Cardholder</label>
                                        <span id="cc-preview-name" style="font-size:0.75rem;">YOUR NAME</span>
                                    </div>
                                    <div class="card-tier" style="font-size:0.6rem; padding: 1px 6px;">PLATINUM</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Form inputs side -->
                        <div class="checkout-form">
                            <div class="form-group">
                                <label for="card-number-input">Card Number</label>
                                <input type="text" id="card-number-input" placeholder="4111 2222 3333 4444" maxlength="19">
                            </div>
                            <div class="form-group">
                                <label for="card-holder-name-input">Cardholder Name</label>
                                <input type="text" id="card-holder-name-input" placeholder="e.g. Karan Sharma">
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                                <div class="form-group">
                                    <label>Expiry Date</label>
                                    <input type="text" placeholder="MM/YY" maxlength="5">
                                </div>
                                <div class="form-group">
                                    <label>CVV</label>
                                    <input type="password" placeholder="•••" maxlength="3">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="glass" style="margin-top: 2rem; padding:1.2rem; border-radius: var(--border-radius-md);">
                        <h5 style="color:var(--color-gold); margin-bottom:0.5rem; font-size:0.85rem;">Booking Confirmation</h5>
                        <ul id="checkout-services-summary" style="font-size:0.8rem; padding-left:1rem; list-style-type:disc; color:var(--color-text-muted);">
                            <!-- List elements -->
                        </ul>
                        <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:0.6rem;">
                            <strong>Stylist:</strong> <span id="checkout-stylist"></span> | 
                            <strong>Schedule:</strong> <span id="checkout-date-time"></span>
                        </div>
                        <div style="margin-top:0.8rem; display:flex; justify-content:space-between; font-size:1.05rem; font-weight:700;">
                            <span>Total Charged</span>
                            <span id="checkout-total-bill" style="color:var(--color-gold);">₹0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="booking-modal-footer">
                <button id="booking-prev-btn" class="btn btn-secondary" onclick="handleBookingPrev()">Back</button>
                <button id="booking-next-btn" class="btn btn-primary" onclick="handleBookingNext()">Proceed</button>
            </div>
        `;
    }
}

// ========================================================================
// 8. Interface Rendering: User Dashboard
// ========================================================================
function renderDashboardScreen() {
    if (!CURRENT_USER) return;
    
    const sideName = document.getElementById("dashboard-user-name");
    if (sideName) sideName.textContent = CURRENT_USER.name;
    
    const sideAvatar = document.querySelector(".dashboard-user-avatar");
    if (sideAvatar && CURRENT_USER.avatar) sideAvatar.src = CURRENT_USER.avatar;
    
    const sideBadge = document.querySelector(".dashboard-sidebar .elite-badge");
    if (sideBadge) {
        const plan = CURRENT_USER.membership && CURRENT_USER.membership.plan ? CURRENT_USER.membership.plan : "None";
        sideBadge.textContent = plan === 'None' ? 'Standard Guest' : plan;
    }

    const isOwner = CURRENT_USER.role === 'Salon Owner';
    const isAdmin = CURRENT_USER.role === 'Admin';
    
    document.querySelectorAll(".customer-link").forEach(el => el.style.display = "block");
    document.querySelectorAll(".owner-link").forEach(el => el.style.display = isOwner || isAdmin ? "block" : "none");
    document.querySelectorAll(".admin-link").forEach(el => el.style.display = isAdmin ? "block" : "none");

    document.querySelectorAll(".dashboard-nav-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.classList.contains("customer-link") && btn.textContent.includes("Overview")) {
            btn.classList.add("active");
        }
    });
    
    document.querySelectorAll(".dashboard-pane").forEach(pane => {
        pane.classList.remove("active");
    });
    const overviewPane = document.getElementById("dashboard-pane-overview");
    if (overviewPane) overviewPane.classList.add("active");
    
    renderCustomerOverview();
}

function switchDashboardPane(paneName, event) {
    document.querySelectorAll(".dashboard-nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    if (event) {
        event.currentTarget.classList.add("active");
    }

    document.querySelectorAll(".dashboard-pane").forEach(pane => {
        pane.classList.remove("active");
    });
    const activePane = document.getElementById(`dashboard-pane-${paneName}`);
    if (activePane) activePane.classList.add("active");
    
    if (paneName === 'overview') {
        renderCustomerOverview();
    } else if (paneName === 'preferences') {
        populateProfileFormInputs();
    } else if (paneName === 'owner-salon') {
        renderOwnerSalonPane();
    } else if (paneName === 'owner-bookings') {
        renderOwnerBookingsPane();
    } else if (paneName === 'admin-approvals') {
        renderAdminApprovalsPane();
    } else if (paneName === 'admin-analytics') {
        renderAdminAnalyticsPane();
    }
}

async function toggleWishlist(salonId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!AUTH_TOKEN) {
        openAuthModal();
        showToast("Please sign in to save salons to your collection.");
        return;
    }

    try {
        const res = await apiFetch(`/api/users/favorites/${salonId}`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
            APP_STATE.wishlist = data.favorites.map(f => typeof f === 'object' ? f._id : f);
            document.getElementById("nav-wishlist-count").textContent = APP_STATE.wishlist.length;
            
            CURRENT_USER.favorites = data.favorites;
            localStorage.setItem("bee-user", JSON.stringify(CURRENT_USER));
            
            showToast(data.message);
            
            if (APP_STATE.activePage === "home") {
                renderFeaturedSalons();
            } else if (APP_STATE.activePage === "listings") {
                renderListingScreen();
            } else if (APP_STATE.activePage === "dashboard") {
                renderDashboardScreen();
            }
        }
    } catch (err) {
        console.error("Toggle favorites error:", err);
        showToast("Error updating saved collections.");
    }
}

// ========================================================================
// 9. Elite Personalization Card Maker
// ========================================================================
function initElitePageEvents() {
    const inpName = document.getElementById("elite-card-name-input");
    const previewName = document.getElementById("elite-preview-card-holder");
    const cardEl = document.getElementById("elite-interactive-vip-card");

    if (inpName && previewName) {
        inpName.addEventListener("input", (e) => {
            previewName.textContent = e.target.value.toUpperCase() || "VIP MEMBER";
        });
    }

    // Custom 3D Tilt Effect on mousemove
    if (cardEl) {
        cardEl.addEventListener("mousemove", (e) => {
            const rect = cardEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const midX = rect.width / 2;
            const midY = rect.height / 2;

            const rotateX = ((y - midY) / midY) * 15; // Rotate up/down up to 15 deg
            const rotateY = -((x - midX) / midX) * 15; // Rotate left/right

            cardEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        cardEl.addEventListener("mouseleave", () => {
            cardEl.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
        });
    }
}

// ========================================================================
// 10. AI Stylist Quiz Engine (Drawer Navigation)
// ========================================================================
function toggleAIDrawer() {
    const drawer = document.getElementById("ai-assistant-drawer");
    if (!drawer) return;

    drawer.classList.toggle("active");
    if (drawer.classList.contains("active")) {
        // Reset Quiz
        APP_STATE.aiQuiz.step = 1;
        APP_STATE.aiQuiz.answers = { goal: null, neighborhood: null, vibe: null };
        renderAIQuizStep();
    }
}

function renderAIQuizStep() {
    // Hide all steps
    document.querySelectorAll(".ai-quiz-step").forEach(step => step.classList.remove("active"));
    
    const activeStep = document.getElementById(`ai-quiz-step-${APP_STATE.aiQuiz.step}`);
    if (activeStep) activeStep.classList.add("active");
}

function answerAIQuestion(key, value) {
    APP_STATE.aiQuiz.answers[key] = value;
    
    if (APP_STATE.aiQuiz.step < 3) {
        APP_STATE.aiQuiz.step += 1;
        renderAIQuizStep();
    } else {
        // Calculate Recommendation Results
        APP_STATE.aiQuiz.step = 4;
        renderAIQuizStep();
        renderAIRecommendations();
    }
}

function renderAIRecommendations() {
    const listDOM = document.getElementById("ai-recommendations-list");
    if (!listDOM) return;

    listDOM.innerHTML = "";

    const userAns = APP_STATE.aiQuiz.answers;

    // Filter logic based on neighborhood and category/vibe
    let matches = SALONS_DB.filter(salon => {
        // Location filter
        const matchesLoc = userAns.neighborhood === "any" || salon.neighborhood === userAns.neighborhood;
        // Category/Goal filter
        let matchesGoal = true;
        if (userAns.goal === "spa-relax") {
            matchesGoal = salon.services.some(s => s.category === "Spa");
        } else if (userAns.goal === "hair-color") {
            matchesGoal = salon.services.some(s => s.category === "Hair");
        } else if (userAns.goal === "skincare-glow") {
            matchesGoal = salon.services.some(s => s.category === "Skin");
        }
        
        return matchesLoc && matchesGoal;
    });

    // Fallback if zero matches
    if (matches.length === 0) {
        matches = SALONS_DB.slice(0, 2);
    }

    matches.forEach(salon => {
        const itemHTML = `
            <div class="recom-salon-strip glass animate-fade" onclick="navigateToDetailsFromAI(${salon.id})">
                <img class="recom-salon-img" src="${salon.images[0]}" alt="${salon.name}">
                <div class="recom-salon-info">
                    <h5>${salon.name}</h5>
                    <span><i class="fas fa-star" style="font-size:0.75rem;"></i> ${salon.rating} • ${salon.neighborhood}</span>
                    <p style="font-size:0.7rem; color:var(--color-muted); margin-top:3px;">${salon.tagline}</p>
                </div>
            </div>
        `;
        listDOM.insertAdjacentHTML("beforeend", itemHTML);
    });
}

function navigateToDetailsFromAI(salonId) {
    toggleAIDrawer();
    navigateTo(`details/${salonId}`);
}

// ========================================================================
// 11. Custom Toast Notifications
// ========================================================================
function showToast(message) {
    let container = document.getElementById("toast-holder");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-holder";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast-message glass";
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.8rem;">
            <i class="fas fa-bell text-gold"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Fade out after 4 seconds
    setTimeout(() => {
        toast.style.animation = "fadeIn 0.3s ease reverse forwards";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// ========================================================================
// 12. Application Initialization
// ========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Router
    initRouter();

    // Initialize Theme Switcher
    initThemeToggle();
    
    // Bind global header scrolled state
    const navbar = document.querySelector(".navbar");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    // Run app initialization asynchronously
    await initApp();

    // Bind interactive animations for static page structures
    bindInteractive3D();

    // Initialize scroll-driven parallax reveals
    initScrollObserver();

    // Initialize luxury 3D background elements parallax
    init3DParallax();
});

// ========================================================================
// 13. Interactive 3D tilt & spotlight tracking
// ========================================================================
function bindInteractive3D() {
    const cards = document.querySelectorAll(".salon-card, .service-card, .plan-card, .testimonial-card");
    
    cards.forEach(card => {
        // Ensure reflection glare layer is present
        if (!card.querySelector(".card-reflection")) {
            const reflection = document.createElement("div");
            reflection.className = "card-reflection";
            card.insertBefore(reflection, card.firstChild);
        }

        // Initialize state if not present
        if (!card._tiltState) {
            const isTestimonial = card.classList.contains("testimonial-card");
            const isService = card.classList.contains("service-card");
            const defaultShadowY = isTestimonial || isService ? 15 : 25;
            const defaultShadowBlur = isTestimonial || isService ? 30 : 50;

            card._tiltState = {
                currentRotateX: 0,
                currentRotateY: 0,
                currentScale: 1,
                currentTranslateY: 0,
                currentShadowX: 0,
                currentShadowY: defaultShadowY,
                currentShadowBlur: defaultShadowBlur,
                currentGlareOpacity: 0,
                currentGlareX: 0,
                currentGlareY: 0,
                currentGlowOpacity: 0,

                targetRotateX: 0,
                targetRotateY: 0,
                targetScale: 1,
                targetTranslateY: 0,
                targetShadowX: 0,
                targetShadowY: defaultShadowY,
                targetShadowBlur: defaultShadowBlur,
                targetGlareOpacity: 0,
                targetGlareX: 0,
                targetGlareY: 0,
                targetGlowOpacity: 0,

                mouseX: 0,
                mouseY: 0,
                isHovered: false,
                rafId: null,
                defaultShadowY: defaultShadowY,
                defaultShadowBlur: defaultShadowBlur
            };
        }

        const state = card._tiltState;

        const tick = () => {
            const lerpFactor = 0.08; // smooth Apple-style inertia

            // Interpolate values
            state.currentRotateX += (state.targetRotateX - state.currentRotateX) * lerpFactor;
            state.currentRotateY += (state.targetRotateY - state.currentRotateY) * lerpFactor;
            state.currentScale += (state.targetScale - state.currentScale) * lerpFactor;
            state.currentTranslateY += (state.targetTranslateY - state.currentTranslateY) * lerpFactor;
            state.currentShadowX += (state.targetShadowX - state.currentShadowX) * lerpFactor;
            state.currentShadowY += (state.targetShadowY - state.currentShadowY) * lerpFactor;
            state.currentShadowBlur += (state.targetShadowBlur - state.currentShadowBlur) * lerpFactor;
            state.currentGlareOpacity += (state.targetGlareOpacity - state.currentGlareOpacity) * lerpFactor;
            state.currentGlareX += (state.targetGlareX - state.currentGlareX) * lerpFactor;
            state.currentGlareY += (state.targetGlareY - state.currentGlareY) * lerpFactor;
            state.currentGlowOpacity += (state.targetGlowOpacity - state.currentGlowOpacity) * lerpFactor;

            // Apply to styles
            card.style.setProperty("--rotate-x", `${state.currentRotateX}deg`);
            card.style.setProperty("--rotate-y", `${state.currentRotateY}deg`);
            card.style.setProperty("--scale", state.currentScale);
            card.style.setProperty("--translate-y", `${state.currentTranslateY}px`);
            card.style.setProperty("--shadow-x", `${state.currentShadowX}px`);
            card.style.setProperty("--shadow-y", `${state.currentShadowY}px`);
            card.style.setProperty("--shadow-blur", `${state.currentShadowBlur}px`);
            card.style.setProperty("--glare-x", `${state.currentGlareX}px`);
            card.style.setProperty("--glare-y", `${state.currentGlareY}px`);
            card.style.setProperty("--glare-opacity", state.currentGlareOpacity);

            // Edge gold glow
            const isLight = document.body.classList.contains("light-theme");
            const glowColor = isLight ? `rgba(150, 114, 26, ${0.18 * state.currentGlowOpacity})` : `rgba(212, 175, 55, ${0.18 * state.currentGlowOpacity})`;
            card.style.setProperty("--gold-glow-style", `0 15px 35px ${glowColor}`);

            // Check if settled
            const diffRotateX = Math.abs(state.targetRotateX - state.currentRotateX);
            const diffRotateY = Math.abs(state.targetRotateY - state.currentRotateY);
            const diffScale = Math.abs(state.targetScale - state.currentScale);
            const diffTranslateY = Math.abs(state.targetTranslateY - state.currentTranslateY);
            const diffGlow = Math.abs(state.targetGlowOpacity - state.currentGlowOpacity);

            if (!state.isHovered && diffRotateX < 0.01 && diffRotateY < 0.01 && diffScale < 0.001 && diffTranslateY < 0.01 && diffGlow < 0.01) {
                card.style.setProperty("--rotate-x", "0deg");
                card.style.setProperty("--rotate-y", "0deg");
                card.style.setProperty("--scale", "1");
                card.style.setProperty("--translate-y", "0px");
                card.style.setProperty("--shadow-x", "0px");
                card.style.setProperty("--shadow-y", `${state.defaultShadowY}px`);
                card.style.setProperty("--shadow-blur", `${state.defaultShadowBlur}px`);
                card.style.setProperty("--glare-opacity", "0");
                card.style.setProperty("--gold-glow-style", "0 0 0 transparent");
                state.rafId = null;
            } else {
                state.rafId = requestAnimationFrame(tick);
            }
        };

        const onMouseEnter = () => {
            state.isHovered = true;
            state.targetScale = 1.05;
            state.targetTranslateY = -10;
            const isTestimonial = card.classList.contains("testimonial-card");
            const isService = card.classList.contains("service-card");
            state.targetShadowBlur = isTestimonial || isService ? 45 : 65;
            state.targetGlareOpacity = 0.15;
            state.targetGlowOpacity = 1;

            if (!state.rafId) {
                state.rafId = requestAnimationFrame(tick);
            }
        };

        const onMouseMove = (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            state.mouseX = x;
            state.mouseY = y;

            const midX = rect.width / 2;
            const midY = rect.height / 2;
            const dx = (x - midX) / midX;
            const dy = (y - midY) / midY;

            state.targetRotateX = -(dy * 12);
            state.targetRotateY = dx * 12;

            state.targetShadowX = -(dx * 16);
            state.targetShadowY = -(dy * 16) + state.defaultShadowY;

            state.targetGlareX = x;
            state.targetGlareY = y;
        };

        const onMouseLeave = () => {
            state.isHovered = false;
            state.targetRotateX = 0;
            state.targetRotateY = 0;
            state.targetScale = 1;
            state.targetTranslateY = 0;
            state.targetShadowX = 0;
            state.targetShadowY = state.defaultShadowY;
            state.targetShadowBlur = state.defaultShadowBlur;
            state.targetGlareOpacity = 0;
            state.targetGlowOpacity = 0;

            if (!state.rafId) {
                state.rafId = requestAnimationFrame(tick);
            }
        };

        card.removeEventListener("mouseenter", card._onMouseEnter);
        card.removeEventListener("mousemove", card._onMouseMove);
        card.removeEventListener("mouseleave", card._onMouseLeave);

        card.addEventListener("mouseenter", onMouseEnter);
        card.addEventListener("mousemove", onMouseMove);
        card.addEventListener("mouseleave", onMouseLeave);

        card._onMouseEnter = onMouseEnter;
        card._onMouseMove = onMouseMove;
        card._onMouseLeave = onMouseLeave;
    });
}

function initScrollObserver() {
    const options = {
        root: null,
        rootMargin: "0px 0px -100px 0px",
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal-visible");
                obs.unobserve(entry.target);
            }
        });
    }, options);

    const revealElements = document.querySelectorAll(".reveal-fade-up");
    revealElements.forEach(el => observer.observe(el));
    
}

// ========================================================================
// 14. Luxury Light/Dark Theme Controller
// ========================================================================
function initThemeToggle() {
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (!themeBtn) return;

    // Read stored theme preference (default is dark)
    const savedTheme = localStorage.getItem("bee-theme") || "dark";
    setTheme(savedTheme);

    themeBtn.addEventListener("click", () => {
        const isLight = document.body.classList.contains("light-theme");
        const newTheme = isLight ? "dark" : "light";
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    const themeBtn = document.getElementById("theme-toggle-btn");
    const icon = themeBtn ? themeBtn.querySelector("i") : null;

    if (theme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        if (icon) icon.className = "fas fa-sun";
        localStorage.setItem("bee-theme", "light");
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        if (icon) icon.className = "fas fa-moon";
        localStorage.setItem("bee-theme", "dark");
    }
}

function init3DParallax() {
    const container = document.querySelector(".hero-3d-container");
    const wraps = document.querySelectorAll(".bg-3d-element-wrap");
    if (!container || wraps.length === 0) return;

    // Track state coordinates
    const state = {
        mouseX: 0,
        mouseY: 0,
        currentX: 0,
        currentY: 0,
        isTracking: false,
        rafId: null
    };

    const hero = document.querySelector(".hero-section");
    if (!hero) return;

    const tick = () => {
        const lerpFactor = 0.08; // smooth inertia
        state.currentX += (state.mouseX - state.currentX) * lerpFactor;
        state.currentY += (state.mouseY - state.currentY) * lerpFactor;

        wraps.forEach(wrap => {
            const speed = parseFloat(wrap.dataset.speed) || 0.03;
            // Shift elements in opposite directions based on speed coordinates
            const shiftX = (state.currentX * speed * 250).toFixed(2) + "px";
            const shiftY = (state.currentY * speed * 250).toFixed(2) + "px";
            wrap.style.setProperty("--px-x", shiftX);
            wrap.style.setProperty("--px-y", shiftY);
        });

        // Continue running loop if active or values haven't settled to 0
        const diffX = Math.abs(state.mouseX - state.currentX);
        const diffY = Math.abs(state.mouseY - state.currentY);

        if (!state.isTracking && diffX < 0.005 && diffY < 0.005) {
            wraps.forEach(wrap => {
                wrap.style.setProperty("--px-x", "0px");
                wrap.style.setProperty("--px-y", "0px");
            });
            state.rafId = null;
        } else {
            state.rafId = requestAnimationFrame(tick);
        }
    };

    hero.addEventListener("mousemove", (e) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Calculate offset from center (-1 to 1)
        state.mouseX = (e.clientX - width / 2) / (width / 2);
        state.mouseY = (e.clientY - height / 2) / (height / 2);
        state.isTracking = true;

        if (!state.rafId) {
            state.rafId = requestAnimationFrame(tick);
        }
    });

    hero.addEventListener("mouseleave", () => {
        state.mouseX = 0;
        state.mouseY = 0;
        state.isTracking = false;
    });
}

