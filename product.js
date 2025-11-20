let currentVariantId = null;
let customFields = [];
let openCheckout = false;

const container = document.querySelector(".product-summary");

const productId = container.getAttribute("data-product-id");

const categoryId = container.getAttribute("data-category-id");

const variantsListElement = document.querySelector("#variants-list");
if (variantsListElement) {
    const variantsList = variantsListElement.querySelectorAll("#variant");

    variantsList.forEach((variant) => {
        const variantId = variant.getAttribute("data-variant-id");

        variant.addEventListener("click", () => {
            if (currentVariantId)
                variantsListElement
                    .querySelector(`#variant[data-variant-id="${currentVariantId}"]`)
                    .setAttribute("data-state", "false");
            currentVariantId = variantId;
            variant.setAttribute("data-state", "active");

            document.querySelector("#product-pricing").innerHTML = formatPrice(
                parseInt(variant.getAttribute("data-variant-price")),
            );

            variantsListElement.parentElement.querySelectorAll("button").forEach((button) => {
                button.disabled = false;
            });
        });
    });
}

(async () => {
    function createCustomFields() {
        function Field({ type, customId, placeholder, label, max, min, required }) {
            if (type === "ROBLOX") {
                return `<div id="roblox" data-field-id="${customId}" data-field-type="${type}" class="space-y-2">
                    <label for="${customId}" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">${label}${required ? "<span class='text-red-500 ml-1'>*</span>" : ""}</label>
                    <div class="relative flex items-center w-full">
                        <i data-lucide="search" class="size-5 absolute left-4 text-muted-foreground"></i>
                        <input
                            type="text"
                            id="${customId}"
                            class="flex w-full rounded-md border-2 border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 pl-12 data-[state=error]:border-red-500 h-10"
                            placeholder="${placeholder ?? ""}"
                        />
                    </div>
                </div>`;
            } else if (type === "TEXT" || type === "NUMBER")
                return `<div class="space-y-2" data-field-id="${customId}" data-field-type="${type}">
                    <label for="${customId}" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">${label}${required ? "<span class='text-red-500 ml-1'>*</span>" : ""}</label>
                    <input
                        type=${type === "TEXT" ? "text" : "number"}
                        id="${customId}"
                        class="flex w-full rounded-md border-2 border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=error]:border-red-500 h-10"
                        placeholder="${placeholder ?? ""}"
                        maxlength="${max}"
                        minlength="${min}"
                    />
            </div>`;
        }

        document.querySelector("#custom-fields").innerHTML =
            customFields.map((field) => Field(field)).join(" ") + document.querySelector("#custom-fields").innerHTML;

        document.querySelectorAll("#roblox").forEach((element) => {
            element.querySelectorAll("input").forEach((input) => {
                useTyping(input, {
                    onStop: (content) => {
                        const { execute } = useAction({
                            handle: async (username) => Mginex.getRobloxUser(username),
                            onError: () => {
                                element.removeAttribute("data-value");
                                element.querySelector(".profile")?.remove();
                                element.querySelector(".loading")?.remove();
                            },
                            onSuccess: (data) => {
                                const profile = document.createElement("div");
                                profile.className = "flex items-center gap-3 border p-3 rounded-md profile";

                                const avatar = document.createElement("img");
                                avatar.src = data.avatarUrl;
                                avatar.className = "w-14 h-14 aspect-square rounded-md object-cover";

                                const details = document.createElement("div");
                                details.innerHTML = `
                                <div>${data.displayName}</div>
                                <span class="text-sm text-muted-foreground">@${data.name}</span>
                            `;

                                profile.append(avatar, details);

                                element.querySelector(".profile")?.remove();
                                element.querySelector(".loading")?.remove();
                                element.appendChild(profile);
                                element.setAttribute("data-value", content);
                            },
                        });

                        execute(content);
                    },
                    onStart: () => {
                        const loading = document.createElement("div");
                        loading.innerHTML = Spinner({ size: 8 });
                        loading.className = "flex items-center justify-center gap-3 border p-3 rounded-md loading";

                        element.querySelector(".loading")?.remove();
                        element.querySelector(".profile")?.remove();
                        element.appendChild(loading);
                    },
                });
            });
        });

        document.querySelectorAll("input").forEach((input) => {
            input.addEventListener("change", () => {
                input.classList.remove("border-red-500");
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    try {
        const data = await Mginex.getCustomFields();
        customFields = data.customFields.filter(
            (field) => field.allProducts || field.products.includes(productId) || field.categories.includes(categoryId),
        );
        createCustomFields();
    } catch (error) {}

    document.querySelector("#custom-fields button").addEventListener("click", () => {
        let fields = {};
        let hasError = false;

        document.querySelectorAll("#custom-fields div").forEach((field) => {
            const customId = field.getAttribute("data-field-id");
            const type = field.getAttribute("data-field-type");

            const customField = customFields.find((field) => field.customId === customId);
            if (!customField) return;

            if (type === "ROBLOX") {
                const value = field.getAttribute("data-value");

                if (customField.required && !value) {
                    toast.error(`O campo ${customField.label} é obrigatório`);
                    field.querySelector("input").classList.add("border-red-500");
                    hasError = true;
                } else {
                    hasError = false;
                }

                fields[customId] = value;
            } else {
                const value = field.querySelector("input").value;
                if (customField.required && !value) {
                    toast.error(`O campo ${customField.label} é obrigatório`);
                    field.querySelector("input").classList.add("border-red-500");
                    hasError = true;
                } else {
                    hasError = false;
                }

                fields[customId] = value;
            }
        });

        if (!hasError) {
            addCartItem(productId, 1, currentVariantId, fields, !openCheckout);
            closeDialog(productId);
            if (openCheckout) window.location.href = "/checkout";
        }
    });
})();

(() => {
    const previewElement = document.querySelector("#product-preview");

    previewElement.querySelectorAll(".product-image").forEach((item) => {
        item.addEventListener("click", (event) => {
            let element = event.target;

            if (event.target.tagName === "IMG") {
                element = event.target.parentElement;
            }

            previewElement.querySelector(".product-image[data-state='active']").setAttribute("data-state", "false");
            element.setAttribute("data-state", "active");

            previewElement.querySelector("img").src =
                event.target.tagName === "IMG" ? event.target.src : event.target.querySelector("img").src;
        });
    });
})();

function handleAddProduct(canOpenCheckout = false) {
    openCheckout = canOpenCheckout;

    if (customFields.length < 1) {
        if (canOpenCheckout) window.location.href = "/checkout";
        addCartItem(productId, 1, currentVariantId, undefined, !openCheckout);
    } else openDialog(productId);
}
