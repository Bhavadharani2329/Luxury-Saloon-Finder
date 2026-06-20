const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bee-luxury');
        console.log('Seeder Connected to MongoDB successfully.');
    } catch (error) {
        console.error('Seeder Connection Error:', error.message);
        process.exit(1);
    }
};

const importData = async () => {
    try {
        // Clear existing database collections
        await User.deleteMany();
        await Salon.deleteMany();
        await Service.deleteMany();
        await Booking.deleteMany();
        await Review.deleteMany();

        console.log('Database collections cleared.');

        // 1. Create Default Users
        const users = await User.create([
            {
                name: 'System Admin',
                email: 'admin@bee-luxury.com',
                password: 'admin123',
                phone: '+919988776655',
                role: 'Admin',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
            },
            {
                name: 'Dev Karan',
                email: 'owner@bee-luxury.com',
                password: 'owner123',
                phone: '+918877665544',
                role: 'Salon Owner',
                avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80'
            },
            {
                name: 'Aditi Sharma',
                email: 'customer@bee-luxury.com',
                password: 'customer123',
                phone: '+917766554433',
                role: 'Customer',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
            }
        ]);

        const ownerId = users[1]._id;
        const customerId = users[2]._id;
        console.log('Seed users created.');

        // 2. Create Services
        const serviceDocs = await Service.create([
            { name: 'Imperial Gold Leaf Facial', category: 'Spa', duration: '90 mins', price: 8500, description: 'A luxury facial incorporating 24K gold foil sheets to restore skin luminosity, boost collagen, and create an instant red-carpet glow.', image: '' },
            { name: 'Himalayan Hot Stone Massage', category: 'Spa', duration: '75 mins', price: 6500, description: 'Therapeutic hot basalt stones combined with deep massage techniques to ease tense muscles and restore spiritual harmony.', image: '' },
            { name: 'HydraFacial Platinum', category: 'Skin', duration: '60 mins', price: 7200, description: 'Multi-stage advanced skin cleansing, extraction, and deep hydration infused with antioxidants and peptides.', image: '' },
            { name: 'Luxury Manicure & Caviar Spa', category: 'Nails', duration: '60 mins', price: 2999, description: 'Premium hand therapy featuring organic scrub, massage, and detailed cuticle styling with a collagen glove wrap.', image: '' },
            { name: 'Bridal Royal Makeover & Couture Hair', category: 'Makeup', duration: '180 mins', price: 19999, description: 'The ultimate royal bridal experience including HD makeup, traditional styling, and direct VIP concierge mapping.', image: '' },
            
            { name: "Signature 'Method' Cut by Director", category: 'Hair', duration: '75 mins', price: 9000, description: 'Bespoke styling and structural haircut executed by the salon\'s Creative Director using custom Italian texturizing techniques.', image: '' },
            { name: 'Balayage Couture & Blowdry', category: 'Hair', duration: '180 mins', price: 12000, description: 'Hand-painted organic highlights for seamless blending, followed by a premium signature silk-press blowout.', image: '' },
            { name: 'Kérastase Caviar Hair Ritual', category: 'Hair', duration: '60 mins', price: 5500, description: 'Rejuvenating treatment combining biomimetic caviar pearls and custom mask complexes for ultimate strength and shine.', image: '' },
            { name: 'Premium Haircut & Styling', category: 'Hair', duration: '45 mins', price: 2499, description: 'High-end hair shape and texture modification by a master stylist, including organic wash and styling glaze.', image: '' },
            { name: 'Caviar Scalp Rejuvenating Spa', category: 'Hair', duration: '60 mins', price: 3999, description: 'Exclusive scalp facial utilizing caviar complexes to refresh hair follicles, relieve scalp tension, and restore natural glow.', image: '' },
            
            { name: 'French Balayage & Toning', category: 'Hair', duration: '120 mins', price: 8000, description: 'Signature Paris coloring service delivering soft transitions, organic tones, and structural glossing.', image: '' },
            { name: 'Champagne Pedicure & Silk Mask', category: 'Nails', duration: '60 mins', price: 3200, description: 'A relaxing pedicure with organic bubbles, Champagne-infused scrub, hot towels, and detailed nail design.', image: '' },
            { name: 'Red Carpet Editorial Makeup', category: 'Makeup', duration: '90 mins', price: 7500, description: 'Flawless HD photo-ready makeup application highlighting your best features for galas, celebrations, or events.', image: '' },
            { name: 'Designer Haircut & Wash', category: 'Hair', duration: '45 mins', price: 1499, description: 'French chic hair redesign including detailed face structure mapping, refreshing wash, and dynamic blowout styling.', image: '' },
            { name: 'Luxury Manicure & Hydration', category: 'Nails', duration: '45 mins', price: 1999, description: 'Bespoke nail therapy featuring honey scrub, massage, and premium French polish finish.', image: '' },
            { name: 'Chic French Hair Spa', category: 'Hair', duration: '75 mins', price: 3999, description: 'Organic hair bath and hot-steam deep-conditioning mask using Parisian essential oils.', image: '' },
            
            { name: 'Micro-Dermabrasion Glow', category: 'Skin', duration: '45 mins', price: 4500, description: 'Medical-grade gentle exfoliation to resurface skin, reduce fine lines, and infuse corrective botanical serum.', image: '' },
            { name: 'Elite Bridal Makeover & Styling', category: 'Makeup', duration: '180 mins', price: 18000, description: 'Detailed custom bridal package including advanced makeup contouring, hair setting, draping, and glow therapy.', image: '' },
            { name: 'Executive Beard Sculpt & Spa Shave', category: 'Grooming', duration: '45 mins', price: 2500, description: 'A precision trim, hot steam towel, essential oil rub, straight razor shave, and luxury charcoal clay mask.', image: '' },
            { name: 'Classic Haircut & Blowdry', category: 'Hair', duration: '40 mins', price: 1499, description: 'Detailed hair trim, refreshing wash, scalp massage, and complete blowdry styling.', image: '' },
            { name: 'Luxury Hydrating Facial', category: 'Skin', duration: '60 mins', price: 4999, description: 'Advanced pore refining, custom botanical mask, and pure hydration serum to lock in a premium, youthful glow.', image: '' },
            { name: 'Bridal Portrait Makeup', category: 'Makeup', duration: '120 mins', price: 14999, description: 'Custom photography-optimized makeup package including high-definition contour, lash extensions, and settings.', image: '' }
        ]);

        console.log('Seed services created.');

        // Helper to grab service ObjectIds by name array
        const getServiceIds = (names) => {
            return serviceDocs.filter(s => names.includes(s.name)).map(s => s._id);
        };

        // 3. Create Salons (mapped to services and owner)
        const salonDocs = await Salon.create([
            {
                name: 'The Ritz-Carlton Spa',
                tagline: 'Royal therapies & golden signature body treatments.',
                description: 'Set in Bangalore\'s premier luxury hotel, The Ritz-Carlton Spa features high-ceilinged marble spaces, private relaxation lounges, and world-class therapists delivering bespoke Ayurvedic and international therapies.',
                owner: ownerId,
                neighborhood: 'Lavelle Road',
                address: 'No. 99, Residency Road, Bangalore 560025',
                startingPrice: 2999,
                averagePrice: 7200,
                premiumPrice: 19999,
                rating: 4.9,
                ratingCount: 2,
                openingHours: '09:00 AM - 10:00 PM',
                luxuryBadge: 'Bee Elite Partner',
                isApproved: true,
                images: [
                    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80'
                ],
                services: getServiceIds([
                    'Imperial Gold Leaf Facial',
                    'Himalayan Hot Stone Massage',
                    'HydraFacial Platinum',
                    'Luxury Manicure & Caviar Spa',
                    'Bridal Royal Makeover & Couture Hair'
                ])
            },
            {
                name: 'Rossano Ferretti Hair Spa',
                tagline: 'The famous Italian Method haircut & advanced hair craft.',
                description: 'Brought directly from Milan, Rossano Ferretti offers the signature \'Method\' haircut that works with the natural fall and flow of your hair. A truly personalized, high-fashion styling experience.',
                owner: ownerId,
                neighborhood: 'Koramangala',
                address: 'No. 402, 80 Feet Road, 4th Block, Koramangala, Bangalore 560034',
                startingPrice: 2499,
                averagePrice: 7500,
                premiumPrice: 15000,
                rating: 4.8,
                ratingCount: 2,
                openingHours: '10:00 AM - 08:30 PM',
                luxuryBadge: 'World Renowned',
                isApproved: true,
                images: [
                    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80'
                ],
                services: getServiceIds([
                    "Signature 'Method' Cut by Director",
                    'Balayage Couture & Blowdry',
                    'Kérastase Caviar Hair Ritual',
                    'Premium Haircut & Styling',
                    'Caviar Scalp Rejuvenating Spa'
                ])
            },
            {
                name: 'Jean-Claude Biguine',
                tagline: 'Chic French hair styling & organic skin rejuvenation.',
                description: 'Biguine Salon brings French expertise and organic skin wellness to the heart of Indiranagar. Celebrated for high-performance coloring, hair spas, and state-of-the-art Parisian manicure suites.',
                owner: ownerId,
                neighborhood: 'Indiranagar',
                address: 'No. 25, 100 Feet Road, HAL 2nd Stage, Indiranagar, Bangalore 560038',
                startingPrice: 1499,
                averagePrice: 4999,
                premiumPrice: 9999,
                rating: 4.7,
                ratingCount: 2,
                openingHours: '09:00 AM - 09:00 PM',
                luxuryBadge: 'French Craft',
                isApproved: true,
                images: [
                    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80'
                ],
                services: getServiceIds([
                    'French Balayage & Toning',
                    'Champagne Pedicure & Silk Mask',
                    'Red Carpet Editorial Makeup',
                    'Designer Haircut & Wash',
                    'Luxury Manicure & Hydration',
                    'Chic French Hair Spa'
                ])
            },
            {
                name: 'Bodycraft Spa & Salon',
                tagline: 'High-performance clinical beauty & luxury bridal treatments.',
                description: 'Widely trusted across Bangalore for high-end aesthetic medicine, body contours, and traditional bridal wellness. Bodycraft boasts a highly aesthetic, calming ivory-designed salon lounge.',
                owner: ownerId,
                neighborhood: 'Sadashivanagar',
                address: 'No. 12, Sankey Road, Sadashivanagar, Bangalore 560080',
                startingPrice: 1499,
                averagePrice: 4500,
                premiumPrice: 9999,
                rating: 4.6,
                ratingCount: 2,
                openingHours: '09:30 AM - 09:30 PM',
                luxuryBadge: 'Skin Pioneers',
                isApproved: true,
                images: [
                    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80'
                ],
                services: getServiceIds([
                    'Micro-Dermabrasion Glow',
                    'Elite Bridal Makeover & Styling',
                    'Executive Beard Sculpt & Spa Shave',
                    'Classic Haircut & Blowdry',
                    'Luxury Hydrating Facial',
                    'Bridal Portrait Makeup'
                ])
            }
        ]);

        console.log('Seed salons created.');

        // 4. Create Sample Reviews
        await Review.create([
            { user: customerId, salon: salonDocs[0]._id, rating: 5, comment: 'The gold leaf facial is worth every rupee. Outstanding hospitality and luxurious ambiance.' },
            { user: customerId, salon: salonDocs[0]._id, rating: 4.8, comment: 'Incredible hot stone massage. The therapists here are truly masters of their craft.' },
            
            { user: customerId, salon: salonDocs[1]._id, rating: 5, comment: 'Finally got the Method cut. It\'s magic, my hair falls beautifully even weeks later!' },
            { user: customerId, salon: salonDocs[1]._id, rating: 4.6, comment: 'Very premium styling. Balayage looks incredibly natural. Worth the splurge.' },
            
            { user: customerId, salon: salonDocs[2]._id, rating: 4.7, comment: 'Biguine has the best nail spa. The Champagne pedicure is divine.' },
            { user: customerId, salon: salonDocs[2]._id, rating: 4.8, comment: 'Exceptional hair service. Very polite and expert stylists.' },
            
            { user: customerId, salon: salonDocs[3]._id, rating: 5, comment: 'Best bridal experience! The makeup was natural yet gorgeous. Highly recommend.' },
            { user: customerId, salon: salonDocs[3]._id, rating: 4.2, comment: 'Clean facilities, high standards of hygiene. The beard sculpting and shave are relaxing.' }
        ]);

        console.log('Seed reviews created.');
        console.log('Database fully seeded with realistic Bangalore luxury salons and accounts!');
        process.exit(0);
    } catch (error) {
        console.error('Database seeding failed:', error.message);
        process.exit(1);
    }
};

// Execute seeding sequence
const runSeeder = async () => {
    await connectDB();
    await importData();
};

runSeeder();
