"""
store/paystack_helpers.py
─────────────────────────
Couche d'abstraction Paystack pour le système escrow de FindIt.

Usage :
    from store.paystack_helpers import initialize_transaction, verify_transaction, PaystackError

    try:
        result = initialize_transaction(email=..., amount=..., reference=..., callback_url=...)
        auth_url = result["data"]["authorization_url"]
    except PaystackError as e:
        # message d'erreur propre, déjà loggé
        return Response({"message": str(e)}, status=502)
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
PAYSTACK_BASE_URL   = getattr(settings, "PAYSTACK_BASE_URL",   "https://api.paystack.co")
PAYSTACK_SECRET_KEY = getattr(settings, "PAYSTACK_SECRET_KEY", None)


# ── Exception ──────────────────────────────────────────────────────────────────
class PaystackError(Exception):
    """Erreur Paystack : API down, clé invalide, montant nul, etc."""


# ── Helpers internes ───────────────────────────────────────────────────────────
def _headers() -> Dict[str, str]:
    key = PAYSTACK_SECRET_KEY or getattr(settings, "PAYSTACK_SECRET_KEY", None)
    if not key:
        raise PaystackError(
            "PAYSTACK_SECRET_KEY absent de settings / .env. "
            "Ajoutez-le et redémarrez le serveur."
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def to_paystack_amount(amount: Decimal | int | float | str, currency: str = "GHS") -> int:
    """
    Convertit un montant lisible (ex : Decimal('50.00') pour 50 GHS)
    en la plus petite unité attendue par Paystack (kobo / pesewa / …).

    Paystack attend toujours amount * 100, quelle que soit la devise.
    Ex : 50.00 GHS → 5000 | 1000 XOF → 100000
    """
    try:
        amt = Decimal(str(amount or "0"))
    except Exception as exc:
        raise ValueError(f"Montant non convertible : {amount!r}") from exc

    smallest = int((amt * 100).quantize(Decimal("1")))
    if smallest <= 0:
        raise ValueError("Le montant doit être > 0.")
    return smallest


# ── Fonctions publiques ────────────────────────────────────────────────────────
def initialize_transaction(
    *,
    email: str,
    amount: int,
    currency: Optional[str] = None,
    reference: Optional[str] = None,
    callback_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    channels: Optional[List[str]] = None,
    timeout: int = 15,
) -> Dict[str, Any]:
    """
    POST /transaction/initialize

    Paramètres :
        email        – email du payeur
        amount       – montant en plus petite unité (int). Utilisez to_paystack_amount().
        currency     – "GHS", "NGN", "USD", "XOF", … (défaut : settings.PAYSTACK_CURRENCY)
        reference    – référence unique de transaction (oid de commande par ex.)
        callback_url – URL de retour après paiement
        metadata     – dict libre passé à Paystack (order_oid, product, etc.)
        channels     – ex. ["card"], ["mobile_money"]

    Retourne le corps JSON Paystack complet (dict).
    Lève PaystackError en cas d'échec.
    """
    if not isinstance(amount, int) or amount <= 0:
        raise PaystackError(
            f"initialize_transaction : amount doit être un entier > 0 "
            f"(reçu {amount!r}). Utilisez to_paystack_amount()."
        )

    used_currency = (currency or getattr(settings, "PAYSTACK_CURRENCY", "GHS")).upper()

    payload: Dict[str, Any] = {
        "email"   : email or "guest@example.com",
        "amount"  : amount,
        "currency": used_currency,
    }
    if reference:
        payload["reference"] = reference
    if callback_url:
        payload["callback_url"] = callback_url
    if metadata:
        payload["metadata"] = metadata
    if channels:
        payload["channels"] = channels

    logger.debug("Paystack initialize → payload=%s", payload)

    try:
        resp = requests.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers=_headers(),
            json=payload,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.exception("Paystack initialize : erreur réseau")
        raise PaystackError(f"Erreur réseau Paystack : {exc}") from exc

    # Tente de parser le JSON
    try:
        data = resp.json()
    except Exception:
        logger.error(
            "Paystack initialize : réponse non-JSON (status=%s) : %s",
            resp.status_code, resp.text[:500],
        )
        raise PaystackError(
            f"Réponse Paystack non-JSON (HTTP {resp.status_code}) : {resp.text[:200]}"
        )

    if resp.status_code >= 400 or not data.get("status"):
        msg = data.get("message") if isinstance(data, dict) else f"HTTP {resp.status_code}"
        logger.error(
            "Paystack initialize échoué : status=%s data=%s",
            resp.status_code, data,
        )
        raise PaystackError(f"Paystack initialize : {msg}")

    return data


def verify_transaction(reference: str, *, timeout: int = 15) -> Dict[str, Any]:
    """
    GET /transaction/verify/{reference}

    Retourne le corps JSON Paystack complet.
    Lève PaystackError en cas d'échec.
    """
    try:
        resp = requests.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=_headers(),
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.exception("Paystack verify : erreur réseau")
        raise PaystackError(f"Erreur réseau Paystack : {exc}") from exc

    try:
        data = resp.json()
    except Exception:
        logger.error(
            "Paystack verify : réponse non-JSON (status=%s) : %s",
            resp.status_code, resp.text[:500],
        )
        raise PaystackError(
            f"Réponse Paystack non-JSON (HTTP {resp.status_code}) : {resp.text[:200]}"
        )

    if resp.status_code >= 400 or not data.get("status"):
        msg = data.get("message") if isinstance(data, dict) else f"HTTP {resp.status_code}"
        logger.error(
            "Paystack verify échoué : status=%s data=%s",
            resp.status_code, data,
        )
        raise PaystackError(f"Paystack verify : {msg}")

    return data
