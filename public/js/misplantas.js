document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const plantImage = document.getElementById('plantImage');
    const preview = document.getElementById('preview');
    const plantForm = document.getElementById('plantForm');
    const plantsGrid = document.getElementById('plantsGrid');

    let currentImageData = "";

    // Simular clic en input file
    dropZone.onclick = () => plantImage.click();

    // Previsualizar Imagen
    plantImage.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                preview.src = event.target.result;
                preview.style.display = 'block';
                currentImageData = event.target.result;
                dropZone.querySelector('.upload-placeholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    // Agregar Nueva Planta
    plantForm.onsubmit = (e) => {
        e.preventDefault();
        
        const name = document.getElementById('plantName').value;
        const type = document.getElementById('plantType').value;
        const date = new Date().toLocaleDateString();

        const card = document.createElement('div');
        card.className = 'plant-card-post animate-in';
        
        card.innerHTML = `
            <div class="user-meta" style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                <div style="width: 35px; height: 35px; background: #ddd; border-radius: 50%;"></div>
                <div>
                    <strong style="display:block; font-size: 14px;">@miler</strong>
                    <small style="color:#999">${date}</small>
                </div>
            </div>
            <img src="${currentImageData || 'https://via.placeholder.com/400x300'}" class="plant-card-img">
            <div class="plant-card-body">
                <span class="tag" style="background:var(--appiu-green-soft); color:var(--appiu-green); padding:5px 15px; border-radius:20px; font-size:12px; font-weight:bold;">${type}</span>
                <h3 style="margin:15px 0 5px 0;">${name}</h3>
                
                <div class="growth-box">
                    <div style="display:flex; justify-content: space-between; font-size: 13px;">
                        <span>Crecimiento</span>
                        <strong>45%</strong>
                    </div>
                    <div class="progress-container">
                        <div class="progress-fill" style="width: 45%"></div>
                    </div>
                </div>

                <div class="card-footer" style="display:flex; justify-content: space-between; margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <button style="background:none; border:none; color:var(--appiu-green); cursor:pointer;"><i class="fas fa-tint"></i> Regar</button>
                    <button style="background:none; border:none; color:#ff7675; cursor:pointer;" onclick="this.closest('.plant-card-post').remove()"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;

        plantsGrid.prepend(card);
        
        // Resetear formulario
        plantForm.reset();
        preview.style.display = 'none';
        dropZone.querySelector('.upload-placeholder').style.display = 'block';
    };
});