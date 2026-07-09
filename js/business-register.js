document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace-web.vercel.app/";
    const SERVER_URL = window.UNIPLACE_CONFIG?.serverBaseUrl || "https://uniplace-web.vercel.app/";

    const token = localStorage.getItem("uniplace_token");
    const userRaw = localStorage.getItem("uniplace_user");

    if (!token || !userRaw) {
        window.location.href = "auth.html";
        return;
    }

    const user = JSON.parse(userRaw);

    if (user.role !== "entrepreneur") {
        window.location.href = "dashboard.html";
        return;
    }

    const dayLabels = {
        monday: "Lunes",
        tuesday: "Martes",
        wednesday: "Miércoles",
        thursday: "Jueves",
        friday: "Viernes",
        saturday: "Sábado",
        sunday: "Domingo"
    };

    const defaultDays = Object.keys(dayLabels);

    const cursorGlow = document.querySelector(".cursor-glow");
    const businessForm = document.getElementById("businessForm");
    const businessMessage = document.getElementById("businessMessage");
    const businessStatusBox = document.getElementById("businessStatusBox");
    const businessStatusTitle = document.getElementById("businessStatusTitle");
    const businessStatusText = document.getElementById("businessStatusText");
    const businessRejectionText = document.getElementById("businessRejectionText");
    const logoutBtnForm = document.getElementById("logoutBtnForm");
    const submitBusinessBtn = document.getElementById("submitBusinessBtn");

    const businessMediaStatus = document.getElementById("businessMediaStatus");
    const businessLogoInput = document.getElementById("businessLogoInput");
    const businessCoverInput = document.getElementById("businessCoverInput");
    const businessPhotosInput = document.getElementById("businessPhotosInput");
    const businessLogoPreview = document.getElementById("businessLogoPreview");
    const businessCoverPreview = document.getElementById("businessCoverPreview");
    const businessGalleryPreview = document.getElementById("businessGalleryPreview");
    const uploadBusinessImagesBtn = document.getElementById("uploadBusinessImagesBtn");
    const businessDocumentsStatus = document.getElementById("businessDocumentsStatus");
    const businessDocumentsList = document.getElementById("businessDocumentsList");
    const rucDocumentInput = document.getElementById("rucDocumentInput");
    const permitDocumentInput = document.getElementById("permitDocumentInput");
    const extraDocumentInput = document.getElementById("extraDocumentInput");
    const uploadBusinessDocumentsBtn = document.getElementById("uploadBusinessDocumentsBtn");

    let currentBusiness = null;

    const menuItemsContainer = document.getElementById("menuItemsContainer");
    const addMenuItemBtn = document.getElementById("addMenuItemBtn");
    const hoursContainer = document.getElementById("hoursContainer");
    const faqsContainer = document.getElementById("faqsContainer");
    const addFaqBtn = document.getElementById("addFaqBtn");

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    renderHoursRows();
    addMenuItemRow();
    addFaqRow();

    checkExistingBusiness();

    businessForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = collectBusinessPayload();
        const validationMessage = validateBusinessPayload(payload);

        if (validationMessage) {
            showMessage(validationMessage);
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/business/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo guardar la ficha del emprendimiento.");
                return;
            }

            currentBusiness = data.business || currentBusiness;
            renderBusinessImages(currentBusiness);
            renderBusinessDocuments(currentBusiness);

            if (hasSelectedBusinessFiles()) {
                showMessage("Ficha guardada. Subiendo imágenes del emprendimiento...", true);

                const imagesUploaded = await uploadBusinessImages(false);

                if (!imagesUploaded) {
                    return;
                }
            }

            if (hasSelectedBusinessDocuments()) {
                showMessage("Ficha guardada. Subiendo documentos de validación...", true);

                const documentsUploaded = await uploadBusinessDocuments(false);

                if (!documentsUploaded) {
                    return;
                }
            }

            showMessage(data.message || "Ficha enviada correctamente.", true);

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            console.error("BUSINESS_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    });

    addMenuItemBtn.addEventListener("click", () => {
        addMenuItemRow();
    });

    addFaqBtn.addEventListener("click", () => {
        addFaqRow();
    });

    logoutBtnForm.addEventListener("click", logout);

    businessLogoInput?.addEventListener("change", () => {
        renderSelectedImagePreview(businessLogoInput, businessLogoPreview, "Sin logo", true);
    });

    businessCoverInput?.addEventListener("change", () => {
        renderSelectedImagePreview(businessCoverInput, businessCoverPreview, "Sin portada", false);
    });

    businessPhotosInput?.addEventListener("change", () => {
        renderSelectedGalleryPreview();
    });

    uploadBusinessImagesBtn?.addEventListener("click", async () => {
        await uploadBusinessImages(true);
    });

    [rucDocumentInput, permitDocumentInput, extraDocumentInput].forEach((input) => {
        input?.addEventListener("change", updateDocumentsButtonState);
    });

    uploadBusinessDocumentsBtn?.addEventListener("click", async () => {
        await uploadBusinessDocuments(true);
    });

    async function checkExistingBusiness() {
        try {
            const response = await fetch(`${API_URL}/business/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 404) {
                currentBusiness = null;
                renderBusinessImages(null);
                renderBusinessDocuments(null);

                showStatusBox({
                    title: "Nueva ficha de emprendimiento",
                    text: "Aún no tienes un emprendimiento registrado. Completa la ficha para enviarla a revisión.",
                    rejected: false
                });
                return;
            }

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo verificar el emprendimiento.");
                return;
            }

            currentBusiness = data.business;
            fillBusinessForm(data.business);
            renderBusinessImages(data.business);
            renderBusinessDocuments(data.business);
            renderBusinessStatus(data.business);

        } catch (error) {
            console.error("CHECK_BUSINESS_ERROR:", error);
            showMessage("No se pudo verificar si ya tienes un emprendimiento registrado.");
        }
    }

    function collectBusinessPayload() {
        return {
            businessName: value("businessName"),
            businessType: value("businessType"),
            category: value("category"),
            shortDescription: value("shortDescription"),
            description: value("description"),
            keywords: value("keywords"),
            city: value("city"),
            campusZone: value("campusZone"),
            address: value("address"),
            referencePoint: value("referencePoint"),
            phone: value("phone"),
            whatsapp: value("whatsapp"),
            email: value("businessEmail"),
            instagram: value("instagram"),
            facebook: value("facebook"),
            tiktok: value("tiktok"),
            website: value("website"),
            priceMin: value("priceMin"),
            priceMax: value("priceMax"),
            mainProducts: value("mainProducts"),
            menuSummary: value("menuSummary"),
            scheduleSummary: value("scheduleSummary"),
            paymentMethods: value("paymentMethods"),
            deliveryOptions: value("deliveryOptions"),
            serviceArea: value("serviceArea"),
            targetAudience: value("targetAudience"),
            faqSummary: value("faqSummary"),
            aiExtraContext: value("aiExtraContext"),
            menuItems: collectMenuItems(),
            hours: collectHours(),
            faqs: collectFaqs()
        };
    }

    function validateBusinessPayload(payload) {
        if (!payload.businessName || !payload.businessType || !payload.category) {
            return "Completa nombre, tipo y categoría del emprendimiento.";
        }

        if (!payload.shortDescription || payload.shortDescription.length < 15) {
            return "La descripción corta debe tener al menos 15 caracteres.";
        }

        if (!payload.description || payload.description.length < 30) {
            return "La descripción completa debe tener al menos 30 caracteres.";
        }

        if (!payload.phone || !payload.whatsapp) {
            return "Completa teléfono y WhatsApp.";
        }

        if (!payload.city || !payload.address) {
            return "Completa ciudad y dirección o punto de entrega.";
        }

        if (payload.menuItems.length === 0 && !payload.mainProducts && !payload.menuSummary) {
            return "Agrega al menos un producto/servicio o un resumen de menú.";
        }

        if (payload.hours.length === 0 && !payload.scheduleSummary) {
            return "Agrega al menos un horario o un resumen de atención.";
        }

        return null;
    }

    function collectMenuItems() {
        return Array.from(menuItemsContainer.querySelectorAll(".menu-row"))
            .map((row) => ({
                itemName: row.querySelector("[data-menu='name']")?.value.trim() || "",
                itemCategory: row.querySelector("[data-menu='category']")?.value.trim() || "",
                itemDescription: row.querySelector("[data-menu='description']")?.value.trim() || "",
                price: row.querySelector("[data-menu='price']")?.value.trim() || "",
                isAvailable: !row.querySelector("[data-menu='unavailable']")?.checked
            }))
            .filter((item) => item.itemName);
    }

    function collectHours() {
        return Array.from(hoursContainer.querySelectorAll(".hours-row"))
            .map((row) => {
                const isClosed = row.querySelector("[data-hour='closed']")?.checked || false;

                return {
                    dayOfWeek: row.dataset.day,
                    openingTime: row.querySelector("[data-hour='open']")?.value || "",
                    closingTime: row.querySelector("[data-hour='close']")?.value || "",
                    isClosed,
                    notes: row.querySelector("[data-hour='notes']")?.value.trim() || ""
                };
            })
            .filter((item) => item.isClosed || (item.openingTime && item.closingTime));
    }

    function collectFaqs() {
        return Array.from(faqsContainer.querySelectorAll(".faq-row"))
            .map((row) => ({
                question: row.querySelector("[data-faq='question']")?.value.trim() || "",
                answer: row.querySelector("[data-faq='answer']")?.value.trim() || ""
            }))
            .filter((item) => item.question && item.answer);
    }

    function fillBusinessForm(business) {
        setValue("businessName", business.business_name);
        setValue("businessType", business.business_type);
        setValue("category", business.category_label || business.keywords?.split(",")?.[0] || business.business_type);
        setValue("targetAudience", business.target_audience);
        setValue("shortDescription", business.short_description);
        setValue("description", business.description);
        setValue("keywords", business.keywords);
        setValue("city", business.city);
        setValue("campusZone", business.campus_zone);
        setValue("address", business.address);
        setValue("referencePoint", business.reference_point);
        setValue("phone", business.phone);
        setValue("whatsapp", business.whatsapp);
        setValue("businessEmail", business.email);
        setValue("instagram", business.instagram_url);
        setValue("facebook", business.facebook_url);
        setValue("tiktok", business.tiktok_url);
        setValue("website", business.website_url);
        setValue("priceMin", business.price_min);
        setValue("priceMax", business.price_max);
        setValue("mainProducts", business.main_products);
        setValue("menuSummary", business.menu_summary);
        setValue("scheduleSummary", business.schedule_summary);
        setValue("paymentMethods", business.payment_methods);
        setValue("deliveryOptions", business.delivery_options);
        setValue("serviceArea", business.service_area);
        setValue("faqSummary", business.faq_summary);
        setValue("aiExtraContext", business.ai_extra_context);

        menuItemsContainer.innerHTML = "";
        const menuItems = Array.isArray(business.menu_items) && business.menu_items.length > 0
            ? business.menu_items
            : [{}];

        menuItems.forEach((item) => addMenuItemRow({
            itemName: item.item_name,
            itemCategory: item.item_category,
            itemDescription: item.item_description,
            price: item.price,
            isAvailable: Boolean(item.is_available)
        }));

        renderHoursRows(Array.isArray(business.hours) ? business.hours : []);

        faqsContainer.innerHTML = "";
        const faqs = Array.isArray(business.faqs) && business.faqs.length > 0
            ? business.faqs
            : [{}];

        faqs.forEach((faq) => addFaqRow({
            question: faq.question,
            answer: faq.answer
        }));
    }

    function renderBusinessStatus(business) {
        const labels = {
            pending: "Pendiente de revisión",
            approved: "Aprobado",
            rejected: "Rechazado",
            hidden: "Oculto"
        };

        const texts = {
            pending: "Tu ficha está enviada y espera revisión. Puedes actualizarla, pero al guardar volverá a quedar pendiente.",
            approved: "Tu emprendimiento está aprobado. Si actualizas esta ficha, volverá a revisión para proteger la calidad de las recomendaciones.",
            rejected: "Tu emprendimiento fue rechazado. Revisa la razón, corrige la ficha y vuelve a enviarla.",
            hidden: "Tu emprendimiento está oculto. Puedes reenviar una ficha actualizada para revisión."
        };

        showStatusBox({
            title: labels[business.status] || "Estado del emprendimiento",
            text: texts[business.status] || "Puedes revisar o actualizar la ficha de tu emprendimiento.",
            rejected: business.status === "rejected",
            rejectionReason: business.rejection_reason
        });

        if (business.status === "rejected") {
            submitBusinessBtn.textContent = "Corregir y volver a intentar";
        } else if (business.status === "approved") {
            submitBusinessBtn.textContent = "Actualizar ficha y enviar a revisión";
        } else {
            submitBusinessBtn.textContent = "Enviar ficha a revisión";
        }
    }

    function showStatusBox({ title, text, rejected, rejectionReason }) {
        businessStatusBox.classList.remove("hidden");
        businessStatusTitle.textContent = title;
        businessStatusText.textContent = text;

        if (rejected && rejectionReason) {
            businessRejectionText.classList.remove("hidden");
            businessRejectionText.textContent = `Razón del rechazo: ${rejectionReason}`;
        } else {
            businessRejectionText.classList.add("hidden");
            businessRejectionText.textContent = "";
        }
    }

    function addMenuItemRow(data = {}) {
        const row = document.createElement("article");
        row.className = "dynamic-row menu-row";

        row.innerHTML = `
            <div class="business-grid-4">
                <label>
                    Nombre *
                    <input type="text" data-menu="name" placeholder="Ej: Combo café" value="${escapeAttribute(data.itemName || "")}">
                </label>

                <label>
                    Categoría
                    <input type="text" data-menu="category" placeholder="Ej: Bebidas" value="${escapeAttribute(data.itemCategory || "")}">
                </label>

                <label>
                    Precio
                    <input type="number" min="0" step="0.01" data-menu="price" placeholder="Ej: 2.50" value="${escapeAttribute(data.price ?? "")}">
                </label>

                <label class="checkbox-label">
                    <input type="checkbox" data-menu="unavailable" ${data.isAvailable === false ? "checked" : ""}>
                    No disponible
                </label>
            </div>

            <label>
                Descripción
                <input type="text" data-menu="description" placeholder="Ej: café americano + sanduche" value="${escapeAttribute(data.itemDescription || "")}">
            </label>

            <button type="button" class="remove-row-btn">Eliminar producto</button>
        `;

        row.querySelector(".remove-row-btn").addEventListener("click", () => {
            row.remove();

            if (menuItemsContainer.children.length === 0) {
                addMenuItemRow();
            }
        });

        menuItemsContainer.appendChild(row);
    }

    function renderHoursRows(existingHours = []) {
        hoursContainer.innerHTML = "";

        defaultDays.forEach((day) => {
            const existing = existingHours.find((item) => item.day_of_week === day) || {};
            const isClosed = Boolean(existing.is_closed);

            const row = document.createElement("article");
            row.className = "hours-row";
            row.dataset.day = day;

            row.innerHTML = `
                <strong>${dayLabels[day]}</strong>

                <label>
                    Abre
                    <input type="time" data-hour="open" value="${escapeAttribute(formatTime(existing.opening_time))}" ${isClosed ? "disabled" : ""}>
                </label>

                <label>
                    Cierra
                    <input type="time" data-hour="close" value="${escapeAttribute(formatTime(existing.closing_time))}" ${isClosed ? "disabled" : ""}>
                </label>

                <label>
                    Nota
                    <input type="text" data-hour="notes" placeholder="Ej: bajo pedido" value="${escapeAttribute(existing.notes || "")}">
                </label>

                <label class="checkbox-label">
                    <input type="checkbox" data-hour="closed" ${isClosed ? "checked" : ""}>
                    Cerrado
                </label>
            `;

            const closedInput = row.querySelector("[data-hour='closed']");
            const timeInputs = row.querySelectorAll("[data-hour='open'], [data-hour='close']");

            closedInput.addEventListener("change", () => {
                timeInputs.forEach((input) => {
                    input.disabled = closedInput.checked;
                    if (closedInput.checked) input.value = "";
                });
            });

            hoursContainer.appendChild(row);
        });
    }

    function addFaqRow(data = {}) {
        const row = document.createElement("article");
        row.className = "dynamic-row faq-row";

        row.innerHTML = `
            <label>
                Pregunta
                <input type="text" data-faq="question" placeholder="Ej: ¿Con cuánto tiempo debo pedir?" value="${escapeAttribute(data.question || "")}">
            </label>

            <label>
                Respuesta
                <input type="text" data-faq="answer" placeholder="Ej: mínimo 30 minutos antes" value="${escapeAttribute(data.answer || "")}">
            </label>

            <button type="button" class="remove-row-btn">Eliminar pregunta</button>
        `;

        row.querySelector(".remove-row-btn").addEventListener("click", () => {
            row.remove();

            if (faqsContainer.children.length === 0) {
                addFaqRow();
            }
        });

        faqsContainer.appendChild(row);
    }


    async function uploadBusinessImages(showSuccessMessage = true) {
        if (!currentBusiness) {
            showMessage("Primero guarda la ficha del emprendimiento antes de subir imágenes.");
            return false;
        }

        if (!hasSelectedBusinessFiles()) {
            showMessage("Selecciona al menos una imagen para subir.");
            return false;
        }

        const formData = new FormData();

        if (businessLogoInput?.files?.[0]) {
            formData.append("businessLogo", businessLogoInput.files[0]);
        }

        if (businessCoverInput?.files?.[0]) {
            formData.append("businessCover", businessCoverInput.files[0]);
        }

        Array.from(businessPhotosInput?.files || []).slice(0, 6).forEach((file) => {
            formData.append("businessPhotos", file);
        });

        try {
            uploadBusinessImagesBtn.disabled = true;
            uploadBusinessImagesBtn.textContent = "Subiendo imágenes...";

            const response = await fetch(`${API_URL}/business/me/images`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudieron subir las imágenes.");
                return false;
            }

            currentBusiness = data.business || currentBusiness;
            clearBusinessFileInputs();
            renderBusinessImages(currentBusiness);
            renderBusinessStatus(currentBusiness);

            if (showSuccessMessage) {
                showMessage(data.message || "Imágenes actualizadas correctamente.", true);
            }

            return true;

        } catch (error) {
            console.error("BUSINESS_IMAGES_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor al subir imágenes.");
            return false;
        } finally {
            uploadBusinessImagesBtn.textContent = "Subir imágenes y enviar a revisión";
            updateImagesButtonState();
        }
    }

    async function uploadBusinessDocuments(showSuccessMessage = true) {
        if (!currentBusiness) {
            showMessage("Primero guarda la ficha del emprendimiento antes de subir documentos.");
            return false;
        }

        if (!hasSelectedBusinessDocuments()) {
            showMessage("Selecciona al menos un documento para subir.");
            return false;
        }

        const formData = new FormData();

        if (rucDocumentInput?.files?.[0]) {
            formData.append("rucDocument", rucDocumentInput.files[0]);
        }

        if (permitDocumentInput?.files?.[0]) {
            formData.append("permitDocument", permitDocumentInput.files[0]);
        }

        if (extraDocumentInput?.files?.[0]) {
            formData.append("extraDocument", extraDocumentInput.files[0]);
        }

        try {
            uploadBusinessDocumentsBtn.disabled = true;
            uploadBusinessDocumentsBtn.textContent = "Subiendo documentos...";

            const response = await fetch(`${API_URL}/business/me/documents`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudieron subir los documentos.");
                return false;
            }

            currentBusiness = data.business || currentBusiness;
            clearBusinessDocumentInputs();
            renderBusinessDocuments(currentBusiness);
            renderBusinessStatus(currentBusiness);

            if (showSuccessMessage) {
                showMessage(data.message || "Documentos actualizados correctamente.", true);
            }

            return true;

        } catch (error) {
            console.error("BUSINESS_DOCUMENTS_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor al subir documentos.");
            return false;
        } finally {
            uploadBusinessDocumentsBtn.textContent = "Subir documentos para revisión";
            updateDocumentsButtonState();
        }
    }

    function hasSelectedBusinessFiles() {
        return Boolean(
            businessLogoInput?.files?.length ||
            businessCoverInput?.files?.length ||
            businessPhotosInput?.files?.length
        );
    }

    function hasSelectedBusinessDocuments() {
        return Boolean(
            rucDocumentInput?.files?.length ||
            permitDocumentInput?.files?.length ||
            extraDocumentInput?.files?.length
        );
    }

    function renderBusinessImages(business) {
        const canUpload = Boolean(business?.id);

        if (businessMediaStatus) {
            businessMediaStatus.textContent = canUpload
                ? "Puedes actualizar logo, portada o galería. Cualquier cambio vuelve a enviar el emprendimiento a revisión."
                : "Primero guarda la ficha del emprendimiento para activar la carga de imágenes.";
        }

        updateImagesButtonState();

        renderExistingImagePreview(
            businessLogoPreview,
            business?.logo_url,
            "Sin logo",
            true
        );

        renderExistingImagePreview(
            businessCoverPreview,
            business?.cover_image_url,
            "Sin portada",
            false
        );

        renderGalleryImages(business?.photos || []);
    }

    function renderBusinessDocuments(business) {
        const canUpload = Boolean(business?.id);
        const documents = Array.isArray(business?.documents) ? business.documents : [];
        const hasRuc = documents.some((document) => document.type === "ruc");
        const hasPermit = documents.some((document) => document.type === "permit");

        if (businessDocumentsStatus) {
            if (!canUpload) {
                businessDocumentsStatus.textContent = "Primero guarda la ficha del emprendimiento para activar la carga de documentos.";
            } else if (hasRuc && hasPermit) {
                businessDocumentsStatus.textContent = "Documentos mínimos cargados. Un administrador podrá revisar el RUC y el permiso antes de aprobar.";
            } else {
                businessDocumentsStatus.textContent = "Falta subir RUC y permiso/patente. Sin esos documentos el administrador no podrá aprobar el emprendimiento.";
            }
        }

        if (!businessDocumentsList) return;

        if (documents.length === 0) {
            businessDocumentsList.innerHTML = `
                <div class="business-gallery-empty">
                    Aún no has subido documentos de validación.
                </div>
            `;
        } else {
            businessDocumentsList.innerHTML = documents
                .map((document) => `
                    <a class="business-document-item" href="${buildImageUrl(document.file_url)}" target="_blank" rel="noopener">
                        <strong>${escapeAttribute(document.label || document.type || "Documento")}</strong>
                        <span>${escapeAttribute(document.original_name || "Archivo cargado")}</span>
                    </a>
                `)
                .join("");
        }

        updateDocumentsButtonState();
    }

    function updateImagesButtonState() {
        if (!uploadBusinessImagesBtn) return;
        uploadBusinessImagesBtn.disabled = !currentBusiness?.id || !hasSelectedBusinessFiles();
    }

    function updateDocumentsButtonState() {
        if (!uploadBusinessDocumentsBtn) return;
        uploadBusinessDocumentsBtn.disabled = !currentBusiness?.id || !hasSelectedBusinessDocuments();
    }

    function renderSelectedImagePreview(input, container, fallbackText, isSquare) {
        const file = input?.files?.[0];

        if (!file) {
            const currentUrl = isSquare ? currentBusiness?.logo_url : currentBusiness?.cover_image_url;
            renderExistingImagePreview(container, currentUrl, fallbackText, isSquare);
            updateImagesButtonState();
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        container.innerHTML = `<img src="${previewUrl}" alt="Vista previa">`;
        updateImagesButtonState();
    }

    function renderExistingImagePreview(container, imageUrl, fallbackText) {
        if (!container) return;

        if (imageUrl) {
            container.innerHTML = `<img src="${buildImageUrl(imageUrl)}" alt="Imagen del emprendimiento">`;
            return;
        }

        container.innerHTML = `<span>${fallbackText}</span>`;
    }

    function renderSelectedGalleryPreview() {
        const selectedFiles = Array.from(businessPhotosInput?.files || []).slice(0, 6);

        if (selectedFiles.length === 0) {
            renderGalleryImages(currentBusiness?.photos || []);
            updateImagesButtonState();
            return;
        }

        businessGalleryPreview.innerHTML = selectedFiles
            .map((file) => `
                <article class="business-gallery-item">
                    <img src="${URL.createObjectURL(file)}" alt="Vista previa de galería">
                    <span>Nueva foto</span>
                </article>
            `)
            .join("");

        updateImagesButtonState();
    }

    function renderGalleryImages(photos = []) {
        if (!businessGalleryPreview) return;

        if (!photos || photos.length === 0) {
            businessGalleryPreview.innerHTML = `
                <div class="business-gallery-empty">
                    Aún no has subido fotos de galería.
                </div>
            `;
            return;
        }

        businessGalleryPreview.innerHTML = photos
            .map((photo) => `
                <article class="business-gallery-item">
                    <img src="${buildImageUrl(photo.image_url)}" alt="Foto del emprendimiento">
                    <button type="button" data-photo-id="${photo.id}">Eliminar</button>
                </article>
            `)
            .join("");

        businessGalleryPreview.querySelectorAll("[data-photo-id]").forEach((button) => {
            button.addEventListener("click", async () => {
                await deleteBusinessPhoto(button.dataset.photoId);
            });
        });
    }

    async function deleteBusinessPhoto(photoId) {
        const confirmed = confirm("¿Quieres eliminar esta foto de la galería?");

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/business/me/photos/${photoId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo eliminar la foto.");
                return;
            }

            currentBusiness.photos = (currentBusiness.photos || []).filter((photo) => String(photo.id) !== String(photoId));
            renderGalleryImages(currentBusiness.photos);
            showMessage("Foto eliminada correctamente.", true);

        } catch (error) {
            console.error("DELETE_BUSINESS_PHOTO_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    function clearBusinessFileInputs() {
        if (businessLogoInput) businessLogoInput.value = "";
        if (businessCoverInput) businessCoverInput.value = "";
        if (businessPhotosInput) businessPhotosInput.value = "";
    }

    function clearBusinessDocumentInputs() {
        if (rucDocumentInput) rucDocumentInput.value = "";
        if (permitDocumentInput) permitDocumentInput.value = "";
        if (extraDocumentInput) extraDocumentInput.value = "";
    }

    function buildImageUrl(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${SERVER_URL}${url}`;
    }

    function showMessage(text, success = false) {
        businessMessage.textContent = text;
        businessMessage.classList.toggle("success", success);
    }

    function setLoading(isLoading) {
        submitBusinessBtn.disabled = isLoading;
        submitBusinessBtn.textContent = isLoading ? "Guardando ficha..." : "Enviar ficha a revisión";
    }

    function logout() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        localStorage.removeItem("uniplace_remember_me");
        window.location.href = "auth.html";
    }

    function value(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, valueToSet) {
        const element = document.getElementById(id);
        if (!element) return;
        element.value = valueToSet ?? "";
    }

    function formatTime(value) {
        if (!value) return "";
        return String(value).slice(0, 5);
    }

    function escapeAttribute(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});
