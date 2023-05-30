const express = require('express');
const app = express();

// Inisialisasi Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(express.json());

// API endpoint untuk user register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    // validasi panjang password
    if (password.length < 8) {
        return res.status(400).json({ error: true, message: 'Password must be at least 8 characters' });
    }

    try {
        // cek apakah email sudah terdaftar
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (!snapshot.empty) {
            return res.status(400).json({ error: true, message: 'Email already exists' });
        }

        // menyimpan data user ke firebase
        await db.collection('users').add({ name, email, password });

        // respon sukses
        res.status(201).json({ error: false, message: 'User Created' });
    } catch (error) {
        // respon jika ada kesalahan data
        console.error('Error registering user:', error);
        res.status(500).json({ error: true, message: 'Failed to register user' });
    }
});

// API endpoint untuk user login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // mencari user berdasarkan email
        const querySnapshot = await db.collection('users').where('email', '==', email).get();
        if (querySnapshot.empty) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        // ambil data user dari hasil query
        const user = querySnapshot.docs[0].data();

        // verifikasi password
        if (user.password !== password) {
            return res.status(401).json({ error: true, message: 'Invalid password' });
        }

        // generate custom token JWT menggunakan Firebase Admin SDK
        const uid = querySnapshot.docs[0].id;
        const customToken = await admin.auth().createCustomToken(uid);

        // respon dengan data user dan token
        res.status(200).json({
            error: false,
            message: 'Success',
            loginResult: {
                userId: uid,
                name: user.name,
                token: customToken,
            },
        });
    } catch (error) {
        // respon jika terjadi kesalahan saat akses database
        console.error('Error logging in:', error);
        res.status(500).json({ error: true, message: 'Failed to login' });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});