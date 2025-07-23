export async function subscribeUserToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: "BKLIarmloT9mLrNRftuwdF58E9NehmhCKVmOm3Fb-UZBByOryPy4pjLuJ4oBSdMhohNNeBC2j2fyAPDAthDNcYc",
  });

  const access = localStorage.getItem("access");

  const res = await fetch("http://192.168.1.13:8000/api/v1/save-subscription/", {
    method: "POST",
    body: JSON.stringify(subscription),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access}`,
    },
  });

  const data = await res.json();
  console.log("Subscription sent to backend", data);
}


//Private Key:KRXTHGjfSv7r1gYfyvyGyu8IqqJTeeDlttY00TrBFbs
