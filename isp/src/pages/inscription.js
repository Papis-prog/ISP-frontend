// src/pages/Inscription.js
import React, { useState, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Inscription.css";

// Email et numéro de l’institut (affichage uniquement côté front)
const INSTITUTE_EMAIL = "ispthies@gmail.com";
const PAYMENT_NUMBER = "77 561 71 84";

// URL de ton backend (variable d'env d'abord, sinon localhost)
const API_URL =
  process.env.REACT_APP_ISP_BACKEND_URL || "http://localhost:3500/api/inscriptions";

console.log("Using backend API URL:", API_URL);

export default function Inscription() {
  const formRef = useRef(null);

  // Étapes du formulaire
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fiche de renseignement (étape 2)
  const [fiche, setFiche] = useState({
    prenom: "",
    nom: "",
    neLe: "",
    a: "",
    adresse: "",
    bac_obtenu: "",
    bac_annee: "",
    bac_mention: "",
    etab1_annee: "",
    etab1_nom: "",
    etab1_classe: "",
    etab2_annee: "",
    etab2_nom: "",
    etab2_classe: "",
  });

  // Inscription BTS/DTS (étape 2 + 4)
  const [inscription, setInscription] = useState({
    filiere: "",
    annee: "1",
    nom: "",
    prenom: "",
    dateNaissance: "",
    lieuNaissance: "",
    adresse: "",
    telephone: "",
    email: "",
    // diplôme
    dernierDiplome_intitule: "",
    dernierDiplome_obtenuEn: "",
    // tuteur
    tuteur_nom: "",
    tuteur_prenom: "",
    tuteur_telephone: "",
    // paiement
    modePaiement: "",
  });

  // Fichiers (étape 3 + 4)
  const [files, setFiles] = useState({
    diplome: null,
    carteIdentite: null,
    recuPaiement: null,
  });

  // Règlement accepté (étape 1)
  const [reglementAccepted, setReglementAccepted] = useState(false);

  // Handlers
  const handleFicheChange = (e) => {
    const { name, value } = e.target;
    setFiche((p) => ({ ...p, [name]: value }));
  };

  const handleInsChange = (e) => {
    const { name, value } = e.target;
    setInscription((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: f } = e.target;
    setFiles((p) => ({ ...p, [name]: f && f[0] ? f[0] : null }));
  };

  // Validation par étape
  const validateStep = (s) => {
    if (s === 1) {
      return reglementAccepted;
    }
    if (s === 2) {
      if (!fiche.prenom || !fiche.nom) return false;
      if (!inscription.filiere || !inscription.telephone || !inscription.email)
        return false;
      return true;
    }
    if (s === 3) {
      if (!files.diplome || !files.carteIdentite) return false;
      return true;
    }
    return true;
  };

  // Navigation
  const next = () => {
    if (!validateStep(step)) {
      toast.error("Veuillez compléter les champs obligatoires.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    // on s’assure que toutes les étapes obligatoires sont ok
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error("Veuillez compléter toutes les étapes obligatoires avant d'envoyer.");
      return;
    }

    // 1) construire les objets comme le backend les attend
    const ficheRenseignement = {
      prenom: fiche.prenom,
      nom: fiche.nom,
      dateNaissance: fiche.neLe || null,
      lieuNaissance: fiche.a || "",
      adresse: fiche.adresse || "",
      bacAnnee: fiche.bac_obtenu || fiche.bac_annee || "",
      mention: fiche.bac_mention || "",
    };

    const etablissements = [];
    if (fiche.etab1_annee || fiche.etab1_nom || fiche.etab1_classe) {
      etablissements.push({
        annee: fiche.etab1_annee,
        etablissement: fiche.etab1_nom,
        classe: fiche.etab1_classe,
      });
    }
    if (fiche.etab2_annee || fiche.etab2_nom || fiche.etab2_classe) {
      etablissements.push({
        annee: fiche.etab2_annee,
        etablissement: fiche.etab2_nom,
        classe: fiche.etab2_classe,
      });
    }

    const formulaireBtsDts = {
      filiere: inscription.filiere,
      annee: inscription.annee,
      prenom: inscription.prenom,
      nom: inscription.nom,
      dateNaissance: inscription.dateNaissance || "",
      lieuNaissance: inscription.lieuNaissance || "",
      dernierDiplomeIntitule: inscription.dernierDiplome_intitule || "",
      dernierDiplomeAnnee: inscription.dernierDiplome_obtenuEn || "",
      adresse: inscription.adresse || "",
      telephone: inscription.telephone || "",
      email: inscription.email || "",
      tuteur: {
        nom: inscription.tuteur_nom || "",
        prenom: inscription.tuteur_prenom || "",
        telephone: inscription.tuteur_telephone || "",
      },
    };

    // paiement (backend)
    let mode = "AUCUN";
    if (inscription.modePaiement === "Institut") mode = "INSTITUT";
    if (inscription.modePaiement === "Wave") mode = "WAVE";
    if (inscription.modePaiement === "Orange Money") mode = "ORANGE_MONEY";

    const paiement = {
      mode,
      reference: "",
    };

    // 2) construire le FormData
    const formData = new FormData();

    // fichiers
    if (files.diplome) formData.append("diplome", files.diplome);
    if (files.carteIdentite) formData.append("carteIdentite", files.carteIdentite);
    if (files.recuPaiement) formData.append("recuPaiement", files.recuPaiement);

    // objets JSON -> on stringify car on est en multipart
    formData.append("ficheRenseignement", JSON.stringify(ficheRenseignement));
    formData.append("etablissements", JSON.stringify(etablissements));
    formData.append("formulaireBtsDts", JSON.stringify(formulaireBtsDts));
    formData.append("paiement", JSON.stringify(paiement));

    setLoading(true);
    try {
      const res = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // le back peut renvoyer success: true même si le mail n'est pas parti
      if (res.data && res.data.success) {
        toast.success("✅ Inscription enregistrée !");
        // afficher le message du back (ex: "mail pas envoyé")
        if (res.data.message) {
          toast.info(res.data.message);
        } else {
          toast.info("Nous allons vous recontacter sous peu.");
        }

        // reset du formulaire
        setStep(1);
        setReglementAccepted(false);
        setFiche({
          prenom: "",
          nom: "",
          neLe: "",
          a: "",
          adresse: "",
          bac_obtenu: "",
          bac_annee: "",
          bac_mention: "",
          etab1_annee: "",
          etab1_nom: "",
          etab1_classe: "",
          etab2_annee: "",
          etab2_nom: "",
          etab2_classe: "",
        });
        setInscription({
          filiere: "",
          annee: "1",
          nom: "",
          prenom: "",
          dateNaissance: "",
          lieuNaissance: "",
          adresse: "",
          telephone: "",
          email: "",
          dernierDiplome_intitule: "",
          dernierDiplome_obtenuEn: "",
          tuteur_nom: "",
          tuteur_prenom: "",
          tuteur_telephone: "",
          modePaiement: "",
        });
        setFiles({ diplome: null, carteIdentite: null, recuPaiement: null });

        // redirection vers la page d'accueil
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        toast.error(res.data?.message || "Erreur d’envoi — vérifiez le serveur.");
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi :", err);
      toast.error("Erreur d’envoi — vérifiez le serveur ou votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  // progress bar percent (0..100)
  const progress = Math.round(((step - 1) / 3) * 100);

  return (
    <div className="insc-wrap">
      {/* Toast */}
      <ToastContainer position="top-right" autoClose={4000} />

      {/* === HEADER === */}
      <header className="insc-header">
        <div className="header-left">
          <img src="logos/institut.jpg" alt="Logo ISP" className="logo" />
          <div className="header-info">
            <h1 id="isp-name">I.S.P</h1>
            <p className="subtext">Institut Supérieur Polytechnique</p>
            <p className="address">184, boulevard Nguinth, Thiès</p>
            <p className="address">Thiès, Sénégal</p>
            <p className="Telephone">+221 77 794 95 78 / 77 398 63 63 /</p>
            <p className="Email">ispthies@gmail.com</p>
          </div>
        </div>
        <div className="header-right">
          <img src="images/senegal-flag.jpg" alt="Drapeau Sénégal" className="flag" />
        </div>
      </header>

      {/* === TITRE FORMULAIRE === */}
      <div className="form-title">Formulaire d'inscription BTS/DTS 2025-2026</div>

      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }} />
      </div>
      <p className="step-tag">Étape {step} / 4</p>

      <form ref={formRef} className="insc-form" onSubmit={handleSubmit}>
        <input type="hidden" name="institute_email" value={INSTITUTE_EMAIL} />

        {/* ---------- ETAPE 1 ---------- */}
        {step === 1 && (
          <section className="step">
            <h2>Étape 1 — Règlement intérieur & conditions</h2>
            <div className="reglement-box">
              <h3>Préambule</h3>
              <p>
                Le présent règlement intérieur a pour objet de définir les règles de vie commune au
                sein de l'ISP de Thiès. Il s'applique à l'ensemble des étudiants...
              </p>
              {/* ... ton texte ... */}
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={reglementAccepted}
                onChange={(e) => setReglementAccepted(e.target.checked)}
                name="reglementAccepted"
              />
              <span> J'ai lu et j'accepte le règlement intérieur et les conditions d'admission</span>
            </label>

            <div className="nav">
              <button type="button" className="btn" onClick={next}>
                Suivant →
              </button>
            </div>
          </section>
        )}

        {/* ---------- ETAPE 2 ---------- */}
        {step === 2 && (
          <section className="step">
            <h2>Étape 2 — Fiche de renseignement & Inscription BTS/DTS</h2>

            <h3>Fiche de renseignement</h3>
            <div className="grid">
              <label>
                Prénom
                <input name="prenom" value={fiche.prenom} onChange={handleFicheChange} />
              </label>
              <label>
                Nom
                <input name="nom" value={fiche.nom} onChange={handleFicheChange} />
              </label>
              <label>
                Né(e) le
                <input type="date" name="neLe" value={fiche.neLe} onChange={handleFicheChange} />
              </label>
              <label>
                À (lieu)
                <input name="a" value={fiche.a} onChange={handleFicheChange} />
              </label>
              <label>
                Adresse
                <input name="adresse" value={fiche.adresse} onChange={handleFicheChange} />
              </label>
              <label>
                Baccalauréat (année)
                <input name="bac_obtenu" value={fiche.bac_obtenu} onChange={handleFicheChange} />
              </label>
              <label>
                Mention
                <input name="bac_mention" value={fiche.bac_mention} onChange={handleFicheChange} />
              </label>
            </div>

            <h4>Établissements (2 dernières années)</h4>
            <div className="grid">
              <label>
                Année
                <input
                  name="etab1_annee"
                  value={fiche.etab1_annee}
                  onChange={handleFicheChange}
                />
              </label>
              <label>
                Établissement
                <input name="etab1_nom" value={fiche.etab1_nom} onChange={handleFicheChange} />
              </label>
              <label>
                Classe
                <input
                  name="etab1_classe"
                  value={fiche.etab1_classe}
                  onChange={handleFicheChange}
                />
              </label>
              <label>
                Année
                <input
                  name="etab2_annee"
                  value={fiche.etab2_annee}
                  onChange={handleFicheChange}
                />
              </label>
              <label>
                Établissement
                <input name="etab2_nom" value={fiche.etab2_nom} onChange={handleFicheChange} />
              </label>
              <label>
                Classe
                <input
                  name="etab2_classe"
                  value={fiche.etab2_classe}
                  onChange={handleFicheChange}
                />
              </label>
            </div>

            <h3>Formulaire d'inscription BTS/DTS</h3>
            <div className="grid">
              <label>
                Filière
                <input name="filiere" value={inscription.filiere} onChange={handleInsChange} />
              </label>
              <label>
                Année
                <select name="annee" value={inscription.annee} onChange={handleInsChange}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
              <label>
                Nom
                <input name="nom" value={inscription.nom} onChange={handleInsChange} />
              </label>
              <label>
                Prénom
                <input name="prenom" value={inscription.prenom} onChange={handleInsChange} />
              </label>
              <label>
                Date naissance
                <input
                  type="date"
                  name="dateNaissance"
                  value={inscription.dateNaissance}
                  onChange={handleInsChange}
                />
              </label>
              <label>
                Lieu naissance
                <input
                  name="lieuNaissance"
                  value={inscription.lieuNaissance}
                  onChange={handleInsChange}
                />
              </label>
              <label>
                Dernier diplôme (intitulé)
                <input
                  name="dernierDiplome_intitule"
                  value={inscription.dernierDiplome_intitule}
                  onChange={handleInsChange}
                />
              </label>
              <label>
                Obtenu en (année)
                <input
                  name="dernierDiplome_obtenuEn"
                  value={inscription.dernierDiplome_obtenuEn}
                  onChange={handleInsChange}
                />
              </label>
              <label>
                Adresse
                <input name="adresse" value={inscription.adresse} onChange={handleInsChange} />
              </label>
              <label>
                Téléphone
                <input name="telephone" value={inscription.telephone} onChange={handleInsChange} />
              </label>
              <label>
                Email
                <input name="email" value={inscription.email} onChange={handleInsChange} />
              </label>
              <label>
                Nom tuteur
                <input name="tuteur_nom" value={inscription.tuteur_nom} onChange={handleInsChange} />
              </label>
              <label>
                Prénom tuteur
                <input
                  name="tuteur_prenom"
                  value={inscription.tuteur_prenom}
                  onChange={handleInsChange}
                />
              </label>
              <label>
                Téléphone tuteur
                <input
                  name="tuteur_telephone"
                  value={inscription.tuteur_telephone}
                  onChange={handleInsChange}
                />
              </label>
            </div>

            <div className="nav">
              <button type="button" className="btn light" onClick={prev}>
                ← Précédent
              </button>
              <button type="button" className="btn" onClick={next}>
                Suivant →
              </button>
            </div>
          </section>
        )}

        {/* ---------- ETAPE 3 ---------- */}
        {step === 3 && (
          <section className="step">
            <h2>Étape 3 — Joindre les documents demandés</h2>
            <p>Formats acceptés : PDF, JPG, PNG. Taille recommandée ≤ 5 Mo.</p>

            <label className="file">
              Diplôme (scan / PDF) *
              <input
                type="file"
                name="diplome"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                required
              />
            </label>

            <label className="file">
              Carte d'identité légalisée *
              <input
                type="file"
                name="carteIdentite"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                required
              />
            </label>

            <p>
              Si vous paierez par Wave ou Orange Money, vous pourrez joindre la capture du reçu à
              l'étape suivante (ou ici).
            </p>

            <div className="nav">
              <button type="button" className="btn light" onClick={prev}>
                ← Précédent
              </button>
              <button type="button" className="btn" onClick={next}>
                Suivant →
              </button>
            </div>
          </section>
        )}

        {/* ---------- ETAPE 4 ---------- */}
        {step === 4 && (
          <section className="step">
            <h2>Étape 4 — Indications de paiement</h2>
            <p>
              Veuillez passer à l'école pour payer les frais d'inscription. Vous pouvez aussi payer
              via Wave ou Orange Money :
            </p>
            <ul>
              <li>
                <strong>Wave :</strong> {PAYMENT_NUMBER}
              </li>
              <li>
                <strong>Orange Money :</strong> {PAYMENT_NUMBER}
              </li>
            </ul>

            <label>
              Mode de paiement (si déjà payé)
              <select
                name="modePaiement"
                value={inscription.modePaiement || ""}
                onChange={handleInsChange}
              >
                <option value="">-- Aucun --</option>
                <option value="Institut">Paiement à l'institut</option>
                <option value="Wave">Wave</option>
                <option value="Orange Money">Orange Money</option>
              </select>
            </label>

            {(inscription.modePaiement === "Wave" ||
              inscription.modePaiement === "Orange Money") && (
              <label className="file">
                Téléverser la capture du reçu de paiement *
                <input
                  type="file"
                  name="recuPaiement"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  required
                />
              </label>
            )}

            <p className="note">
              Tous les fichiers que vous joignez seront envoyés à l'administration pour vérification.
            </p>

            <div className="nav">
              <button type="button" className="btn light" onClick={prev}>
                ← Précédent
              </button>
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Envoi..." : "Terminer / Envoyer"}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
