const globalLogo = new Image(); globalLogo.src = 'logo.png';
const globalQr = new Image(); globalQr.src = 'qr.png';

// ลิงก์ Google Sheets ของคุณ
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQaYhTGhkPtCm2XIsiiFTdaft7WsLzcH7-Bfk_hYyPsQn-gARm2lbGApZYEf71wdDDbQXP93cTNpZC/pub?output=csv'; 

// 🔐 ตั้งค่ารหัสผ่านตรงนี้
const USER = "pokuser";
const PASS = "pok@rama3Shop";

let products = [];
let cart = [];
let savedBills = JSON.parse(localStorage.getItem('savedBills')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // ✅ 1. เช็คว่าล็อกอินหรือยัง?
    checkLogin();
    
    loadProductsFromSheet();
    renderSavedBills();
    setupTabs();
    setupSearchFeatures();
});

// --- 🔐 ระบบล็อกอิน (ใส่กลับมาให้แล้ว) ---
function checkLogin() {
    const isLogged = localStorage.getItem('pok_isLogged');
    const overlay = document.getElementById('loginOverlay');
    
    // ถ้าเคยล็อกอินแล้ว ให้ซ่อนหน้าล็อกอิน
    if (isLogged === 'true') {
        if(overlay) overlay.style.display = 'none';
    } else {
        // ถ้ายัง ให้แสดงหน้าล็อกอิน
        if(overlay) {
            overlay.style.display = 'flex';
            // รีเซ็ตช่องกรอก
            document.getElementById('loginUser').value = '';
            document.getElementById('loginPass').value = '';
        }
    }
}

// กดปุ่ม "เข้าใช้งาน"
const btnLogin = document.getElementById('btnLogin');
if(btnLogin) {
    btnLogin.onclick = () => {
        const u = document.getElementById('loginUser').value.trim();
        const p = document.getElementById('loginPass').value.trim();
        const remember = document.getElementById('rememberMe').checked;

        if (u === USER && p === PASS) {
            // ถ้ารหัสถูก
            if (remember) localStorage.setItem('pok_isLogged', 'true'); // จำถาวร
            else sessionStorage.setItem('pok_isLogged', 'true'); // จำชั่วคราว (ปิดแท็บหาย) // *แก้ให้ใช้ session ถ้าไม่ติ๊กจำ แต่ในโค้ดเดิมใช้ local ทั้งคู่ ปรับตามสะดวกครับ อันนี้ใช้แบบเดิมไปก่อน
            
            // บันทึกว่าล็อกอินแล้ว
            localStorage.setItem('pok_isLogged', 'true'); 
            
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('loginError').style.display = 'none';
        } else {
            // ถ้ารหัสผิด
            document.getElementById('loginError').style.display = 'block';
        }
    };
}

// กดปุ่ม "ออกจากระบบ"
const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.onclick = () => {
        if(confirm('ต้องการออกจากระบบ?')) {
            localStorage.removeItem('pok_isLogged'); // ลบสถานะล็อกอิน
            location.reload(); // รีเฟรชหน้าเว็บ (จะเด้งกลับไปหน้าล็อกอิน)
        }
    };
}

// --- ฟังก์ชันค้นหา & Dropdown ---
function setupSearchFeatures() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const suggestions = document.getElementById('customSuggestions');
    const options = suggestions.querySelectorAll('li');

    input.addEventListener('click', (e) => {
        e.stopPropagation();
        if (suggestions.style.display === 'block') {
            suggestions.style.display = 'none';
        } else {
            suggestions.style.display = 'block';
        }
    });

    input.addEventListener('input', (e) => {
        displayProducts(e.target.value);
        if (e.target.value.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
        suggestions.style.display = 'none';
    });

    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = "";       
        displayProducts("");    
        input.focus();          
        suggestions.style.display = 'block'; 
        clearBtn.style.display = 'none';
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            input.value = opt.innerText;
            displayProducts(opt.innerText);
            suggestions.style.display = 'none';
            clearBtn.style.display = 'block';
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== suggestions && e.target !== clearBtn) {
            suggestions.style.display = 'none';
        }
    });
}

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
        const div = document.createElement('div');
        div.className = 'product-row';
        let color = p.price < 0 ? "red" : (p.category==='invisible'?'#aaa':'#007bff');
        div.innerHTML = `<span>${p.name}</span> <span style="font-weight:bold; color:${color};">${p.price.toLocaleString()}</span>`;
        div.addEventListener('click', () => addToCart(p));
        listDiv.appendChild(div);
    });
}

function addToCart(p) {
    const found = cart.find(i => i.name === p.name);
    if (found) found.qty++; else cart.push({ ...p, qty: 1 });
    renderCart();
}

function renderCart() {
    const div = document.getElementById('cartContents');
    const totalDiv = document.getElementById('totalPrice');
    
    div.innerHTML = "";
    
    if (cart.length === 0) { 
        div.innerHTML = "<div style='text-align:center; color:#999; margin-top:30px;'>ว่างเปล่า</div>"; 
        totalDiv.innerText = "0.-"; 
        return; 
    }
    
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        
        const row = document.createElement('div'); row.className = 'cart-row';

        const info = document.createElement('div'); info.className = 'cart-info';
        let priceStyle = item.price < 0 ? "color:red" : "color:#333";
        info.innerHTML = `<div style="font-weight:bold; ${priceStyle}">${item.name}</div><div style="font-size:11px; color:#666;">@${item.price}</div>`;

        const controls = document.createElement('div'); controls.className = 'cart-controls';
        
        const priceDisplay = document.createElement('div');
        priceDisplay.style.fontWeight = 'bold';
        priceDisplay.style.color = item.price < 0 ? 'red' : '#333';
        priceDisplay.innerText = (item.price * item.qty).toLocaleString();

        const qtyGroup = document.createElement('div'); qtyGroup.className = 'qty-group';

        const btnMinus = document.createElement('button'); btnMinus.className = 'btn-qty'; btnMinus.textContent = '-';
        btnMinus.onclick = () => { if(item.qty > 1) item.qty--; else cart.splice(index, 1); renderCart(); };

        const qtySpan = document.createElement('span'); qtySpan.style.width = '20px'; qtySpan.style.textAlign = 'center'; qtySpan.style.fontWeight = 'bold';
        qtySpan.innerText = item.qty;

        const btnPlus = document.createElement('button'); btnPlus.className = 'btn-qty'; btnPlus.textContent = '+';
        btnPlus.onclick = () => { item.qty++; renderCart(); };

        const btnTrash = document.createElement('button'); btnTrash.className = 'btn-trash'; btnTrash.textContent = '✕';
        btnTrash.onclick = () => { cart.splice(index, 1); renderCart(); };

        qtyGroup.append(btnMinus, qtySpan, btnPlus, btnTrash);
        controls.append(priceDisplay, qtyGroup);
        row.append(info, controls);
        div.appendChild(row);
    });
    
    totalDiv.innerText = `รวม: ${total.toLocaleString()}.-`;
}

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
        div.innerHTML = `<div style="flex:1;"><b>${b.name}</b> <small>(${total.toLocaleString()}.-)</small><br><small style="color:#aaa">${b.date}</small></div>`;
        
        const btnGroup = document.createElement('div');
        const btnLoad = document.createElement('button'); btnLoad.className = 'btn-action-sm btn-load'; btnLoad.textContent = 'โหลด';
        btnLoad.onclick = () => { cart = JSON.parse(JSON.stringify(savedBills[i].items)); renderCart(); };

        const btnDel = document.createElement('button'); btnDel.className = 'btn-action-sm btn-del'; btnDel.textContent = 'ลบ';
        btnDel.onclick = () => { if(confirm("ลบ?")) { savedBills.splice(i,1); localStorage.setItem('savedBills', JSON.stringify(savedBills)); renderSavedBills(); }};

        btnGroup.append(btnLoad, btnDel);
        div.appendChild(btnGroup);
        list.appendChild(div);
    });
}

document.getElementById('clearCart').onclick = () => { if(confirm("ล้างตะกร้า?")) { cart=[]; renderCart(); }};
document.getElementById('savePrice').onclick = () => genBill(true);
document.getElementById('saveNoPrice').onclick = () => genBill(false);

function genBill(showPrice) {
    if(cart.length===0) return;
    const cvs = document.getElementById('billCanvas'); const ctx = cvs.getContext('2d');
    const W = 600, P = 30;
    const LH = 40; 
    const items = cart.filter(i => showPrice || i.category !== 'invisible');
    
    cvs.width = W; cvs.height = 220 + (items.length * LH) + 520;
    
    ctx.fillStyle = "white"; ctx.fillRect(0,0,cvs.width,cvs.height);
    
    let y = -10;
    
    if(globalLogo.complete) { 
        ctx.drawImage(globalLogo, (W-165)/2, y, 165, 165); 
        y+=160; 
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

    const qrSize = 250;
    const qrX = (W - qrSize) / 2;

    ctx.strokeStyle = "#000"; 
    ctx.lineWidth = 2;        
    ctx.strokeRect(qrX, y, qrSize, qrSize); 

    if(globalQr.complete) {
        ctx.drawImage(globalQr, qrX, y, qrSize, qrSize);
    }
    
    setTimeout(() => {
        const link = document.createElement('a'); link.download = `Bill-${Date.now()}.png`;
        link.href = cvs.toDataURL(); link.click();
    }, 200);
}
