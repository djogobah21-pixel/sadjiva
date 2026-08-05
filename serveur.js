const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connexion à la base de données XAMPP
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'federiktech_db'
});

db.connect((err) => {
    if (err) {
        console.error('Erreur MySQL :', err);
        return;
    }
    console.log('Base de données connectée avec succès !');
});

// 1. Route pour envoyer les produits vers le site client et admin
app.get('/api/produits', (req, res) => {
    db.query("SELECT * FROM produits", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// 2. Route pour ajouter un produit depuis l'espace admin
app.post('/api/produits', (req, res) => {
    const { nom, categorie, prix, image, stock } = req.body;
    const sqlInsert = "INSERT INTO produits (nom, categorie, prix, image, stock) VALUES (?, ?, ?, ?, ?)";
    db.query(sqlInsert, [nom, categorie, prix, image, stock], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Produit ajouté !", id: result.insertId });
    });
});

// 3. Route pour supprimer un produit depuis l'espace admin
app.delete('/api/produits/:id', (req, res) => {
    const { id } = req.params;
    const sqlDelete = "DELETE FROM produits WHERE id = ?";
    db.query(sqlDelete, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Produit supprimé !" });
    });
});

// 4. Route pour recevoir et enregistrer les commandes des clients
// Route mise à jour : Enregistre la commande ET diminue les stocks automatiquement
app.post('/api/commandes', (req, res) => {
    const { nom, telephone, commune, panier } = req.body;
    const sqlOrder = "INSERT INTO commandes (nom_client, telephone, commune, details_panier) VALUES (?, ?, ?, ?)";
    
    // 1. On enregistre d'abord la commande globale
    db.query(sqlOrder, [nom, telephone, commune, JSON.stringify(panier)], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json(err);
        }

        // 2. Si la commande est enregistrée, on boucle sur chaque article du panier pour baisser son stock
        if (panier && panier.length > 0) {
            let requetesTerminees = 0;

            panier.forEach(article => {
                const sqlUpdateStock = "UPDATE produits SET stock = stock - 1 WHERE nom = ? AND stock > 0";
                
                db.query(sqlUpdateStock, [article.nom], (updateErr) => {
                    if (updateErr) console.error("Erreur mise à jour stock pour:", article.nom);
                    
                    requetesTerminees++;
                    // Une fois que tous les produits du panier ont été traités, on répond au client
                    if (requetesTerminees === panier.length) {
                        res.json({ message: "Commande validée et stocks mis à jour !", id: result.insertId });
                    }
                });
            });
        } else {
            res.json({ message: "Commande validée !", id: result.insertId });
        }
    });
});
app.listen(5000, () => {
    console.log('Serveur actif sur http://localhost:5000');
});
// Route pour afficher la liste des commandes sur l'espace d'administration
app.get('/api/commandes', (req, res) => {
    db.query("SELECT * FROM commandes ORDER BY date_commande DESC", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});
