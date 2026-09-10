from typing import Any, Dict
import httpx

ZARINPAL_REQ_URL = "https://payment.zarinpal.com/pg/v4/payment/request.json"
ZARINPAL_STARTPAY_URL = "https://payment.zarinpal.com/pg/StartPay/"

class ZarinpalNode:
    """Zarinpal Payment integration node."""
    
    @staticmethod
    async def request_payment(
        merchant_id: str,
        amount_toman: int,
        description: str,
        callback_url: str
    ) -> Dict[str, Any]:
        payload = {
            "merchant_id": merchant_id,
            "amount": amount_toman * 10,  # convert to Rials
            "description": description,
            "callback_url": callback_url
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(ZARINPAL_REQ_URL, json=payload)
            data = resp.json()
            if data.get("data", {}).get("code") == 100:
                authority = data["data"]["authority"]
                return {
                    "success": True,
                    "authority": authority,
                    "payment_url": f"{ZARINPAL_STARTPAY_URL}{authority}"
                }
            return {"success": False, "error": data.get("errors")}
