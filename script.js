const globalLogo = new Image(); globalLogo.src = 'logo.png';
const globalQr = new Image(); globalQr.src = 'qr.png';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQaYhTGhkPtCm2XIsiiFTdaft7WsLzcH7-Bfk_hYyPsQn-gARm2lbGApZYEf71wdDDbQXP93cTNpZC/pub?output=csv'; 

let products = [];
let cart = [];
let savedBills = JSON.parse(localStorage.getItem('savedBills')) || [];

document.addEventListener('DOMContentLoaded', () => {
    loadProductsFromSheet();
    renderSavedBills();
    setupTabs();
});

function loadProductsFromSheet() {
    const listDiv = document.getElementById('itemList');
    listDiv.innerHTML = "<div style='text-align:center; padding:20px; color:#666;'>⏳ กำลังโหลด...</div>";

    fetch(SHEET_CSV_URL)
    .then(r => r.text())
    .then(csvText => {
        const lines = csvText.split('\n');
        products = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 2) {
                let name = parts[2] ? parts[2].replace(/"/g, '').trim() : "สินค้า";
                let price = parseFloat(parts[3] ? parts[3].replace(/,/g, '') : 0);
                let unit = parts[6] ? parts[6].replace(/"/g, '').trim() : "ชิ้น";
                let category = parts[0] || "";
                if(parts[1] && parts[1].trim() !== "-" && !name.includes(parts[1])) {
                    name = parts[1].trim() + " " + name;
                }
                if(name.includes("ล่องหน")) category = "invisible";
                if(name.includes("ส่วนลด") || price < 0) category = "discount";
                if (!isNaN(price)) products.push({ name, price, unit, category });
            }
        }
        displayProducts();
    })
    .catch(e => {
        listDiv.innerHTML = "<div style='text-align:center; color:red;'>❌ โหลดไม่ได้<br>เช็คเน็ต</div>";
        const saved = localStorage.getItem('products_cache');
        if(saved) { products = JSON.parse(saved); displayProducts(); }
    });
}

function setupTabs() {
    const pBtn = document.getElementById('tabProductBtn'), sBtn = document.getElementById('tabSavedBtn');
    const pDiv = document.getElementById('tabProductContent'), sDiv = document.getElementById('tabSavedContent');
    pBtn.onclick = () => { pBtn.classList.add('active'); sBtn.classList.remove('active'); pDiv.classList.add('active'); sDiv.classList.remove('active'); };
    sBtn.onclick = () => { sBtn.classList.add('active'); pBtn.classList.remove('active'); sDiv.classList.add('active'); pDiv.classList.remove('active'); renderSavedBills(); };
}

function displayProducts(filterText = "") {
    const listDiv = document.getElementById('itemList');
    listDiv.innerHTML = "";
    if(products.length > 0) localStorage.setItem('products_cache', JSON.stringify(products));

    const terms = filterText.toLowerCase().trim().split(/\s+/);
    const filtered = products.filter(p => {
        if (p.category === 'invisible' && !filterText.includes('ล่อง')) return false;
        return terms.every(t => p.name.toLowerCase().includes(t));
    });

    if (filtered.length === 0) { listDiv.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>ไม่พบสินค้า</div>"; return; }

    filtered.forEach(p => {
        const div = document.createElement('div'); div.className = 'product-row';
        let color = p.price < 0 ? "red" : (p.category==='invisible'?'#aaa':'#007bff');
        div.innerHTML = `<span>${p.name}</span> <span style="font-weight:bold; color:${color};">${p.price.toLocaleString()}</span>`;
        div.onclick = () => addToCart(p);
        listDiv.appendChild(div);
    });
}

function addToCart(p) {
    const found = cart.find(i => i.name === p.name);
    if (found) found.qty++; else cart.push({ ...p, qty: 1 });
    renderCart();
}

function renderCart() {
    const div = document.getElementById('cartContents'); div.innerHTML = "";
    const totalDiv = document.getElementById('totalPrice');
    if (cart.length === 0) { div.innerHTML = "<div style='text-align:center; color:#999; margin-top:30px;'>ว่างเปล่า</div>"; totalDiv.innerText="0.-"; return; }
    
    let total = 0;
    cart.forEach((item, i) => {
        total += item.price * item.qty;
        const row = document.createElement('div'); row.className = 'cart-row';
        let priceStyle = item.price < 0 ? "color:red" : "color:#333";
        row.innerHTML = `
            <div style="flex:1; padding-right:5px;">
                <div style="font-weight:bold; ${priceStyle}">${item.name}</div>
                <div style="font-size:11px; color:#666;">@${item.price}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <div style="font-weight:bold; ${priceStyle}">${(item.price*item.qty).toLocaleString()}</div>
                <div class="qty-group" style="margin-top:3px;">
                    <button class="btn-qty" onclick="updQty(${i}, -1)">-</button>
                    <span style="width:20px; text-align:center; font-weight:bold;">${item.qty}</span>
                    <button class="btn-qty" onclick="updQty(${i}, 1)">+</button>
                    <button class="btn-trash" onclick="remItem(${i})">🗑️</button>
                </div>
            </div>
        `;
        div.appendChild(row);
    });
    totalDiv.innerText = `รวม: ${total.toLocaleString()}.-`;
}

window.updQty = (i, chg) => { if(cart[i].qty+chg > 0) cart[i].qty+=chg; else cart.splice(i,1); renderCart(); };
window.remItem = (i) => { cart.splice(i, 1); renderCart(); };

document.getElementById('btnSaveOrder').onclick = () => {
    if(cart.length===0) return;
    let name = prompt("ตั้งชื่อบิล:");
    if(name) {
        savedBills.push({ id: Date.now(), name, items: JSON.parse(JSON.stringify(cart)), date: new Date().toLocaleString() });
        localStorage.setItem('savedBills', JSON.stringify(savedBills));
        document.getElementById('tabSavedBtn').click();
    }
};

function renderSavedBills() {
    const list = document.getElementById('savedBillList'); list.innerHTML = "";
    if (savedBills.length === 0) { list.innerHTML = "<div style='text-align:center; color:#999; margin-top:20px;'>ไม่มีบิล</div>"; return; }
    savedBills.forEach((b, i) => {
        const div = document.createElement('div'); div.className = 'saved-bill-row';
        let total = b.items.reduce((s, x) => s + (x.price*x.qty), 0);
        div.innerHTML = `<div style="flex:1;"><b>${b.name}</b> <small>(${total.toLocaleString()}.-)</small><br><small style="color:#aaa">${b.date}</small></div>
        <div><button class="btn-action-sm btn-load" onclick="loadBill(${i})">โหลด</button><button class="btn-action-sm btn-del" onclick="delBill(${i})">ลบ</button></div>`;
        list.appendChild(div);
    });
}
window.loadBill = (i) => { cart = JSON.parse(JSON.stringify(savedBills[i].items)); renderCart(); };
window.delBill = (i) => { if(confirm("ลบ?")) { savedBills.splice(i,1); localStorage.setItem('savedBills', JSON.stringify(savedBills)); renderSavedBills(); }};

document.getElementById('searchInput').oninput = (e) => displayProducts(e.target.value);
document.getElementById('clearCart').onclick = () => { if(confirm("ล้างตะกร้า?")) { cart=[]; renderCart(); }};
document.getElementById('savePrice').onclick = () => genBill(true);
document.getElementById('saveNoPrice').onclick = () => genBill(false);

function genBill(showPrice) {
    if(cart.length===0) return;
    const cvs = document.getElementById('billCanvas'); const ctx = cvs.getContext('2d');
    const W = 600, P = 30;
    const LH = 40; 
    const items = cart.filter(i => showPrice || i.category !== 'invisible');
    
    // ✅ ลดพื้นที่ด้านล่างจาก 480 เหลือ 460
    cvs.width = W; cvs.height = 220 + (items.length * LH) + 460;
    
    ctx.fillStyle = "white"; ctx.fillRect(0,0,cvs.width,cvs.height);
    let y = 30;
    
    if(globalLogo.complete) { 
        ctx.drawImage(globalLogo, (W-120)/2, y, 120, 120); y+=140; 
    } else y+=60;

    ctx.fillStyle="black"; ctx.font="bold 26px sans-serif"; ctx.textAlign="center";
    ctx.fillText("ป๊อกล้อซิ่งพระราม 3 by POK", W/2, y); y+=30;
    
    ctx.font="16px sans-serif"; ctx.fillStyle="#555";
    ctx.fillText(`วันที่: ${new Date().toLocaleString('th-TH')}`, W/2, y); y+=25;
    
    ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W-P, y); ctx.strokeStyle="#ddd"; ctx.stroke(); y+=35;

    ctx.font="20px sans-serif"; 
    items.forEach(i => {
        ctx.textAlign="left"; ctx.fillStyle="black";
        let n = i.name.length > 38 ? i.name.substring(0,36)+"..." : i.name;
        ctx.fillText(n, P, y);
        ctx.textAlign="right";
        if(showPrice) {
            if(i.price<0) ctx.fillStyle="red";
            ctx.fillText(`${i.qty} ${i.unit}  ${(i.price*i.qty).toLocaleString()}`, W-P, y);
        } else ctx.fillText(`${i.qty} ${i.unit}`, W-P, y);
        y+=LH;
    });

    y+=5; ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W-P, y); ctx.strokeStyle="black"; ctx.stroke(); y+=45;
    
    let total = cart.reduce((s, i) => s + (i.price*i.qty), 0);
    ctx.font="bold 30px sans-serif"; ctx.fillStyle="#007bff"; ctx.textAlign="right";
    ctx.fillText(`ยอดสุทธิ: ${total.toLocaleString()} บาท`, W-P, y); y+=50;

    ctx.font="bold 18px sans-serif"; ctx.fillStyle="#333"; ctx.textAlign="center";
    ctx.fillText("ธนาคารกสิกรไทย (KBANK)", W/2, y); y+=30;
    
    ctx.font="bold 24px sans-serif"; 
    ctx.fillText("077-3-90831-1", W/2, y); y+=30;
    
    ctx.font="18px sans-serif"; 
    ctx.fillText("นายประกาศิต ยืนยั่ง", W/2, y); y+=40;

    if(globalQr.complete) ctx.drawImage(globalQr, (W-250)/2, y, 250, 250);
    
    setTimeout(() => {
        const link = document.createElement('a'); link.download = `Bill-${Date.now()}.png`;
        link.href = cvs.toDataURL(); link.click();
    }, 200);
}
