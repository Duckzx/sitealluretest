const checkoutElement = document.querySelector("#checkout");

const gateways = JSON.parse(`<%- JSON.stringify(store.gateways) %>`);

let formData = {
    paymentMethod: "",
    payer: {},
    coupon: null,
};

function ProductItem(props) {
    return `
        <div class="flex flex-wrap items-center gap-3" id="cart-menu-item" data-product-id="${props.id}" data-variant-id="${props.variantId ?? "null"}">
            <div class="relative"><img src="${props.info.mainImage}" width="56" height="56" class="rounded-md w-16 aspect-square object-cover border-2 border-white/5" alt="${props.info.title}">
                <div class="inline-flex items-center border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 py-0 px-2 absolute -top-3 -right-3 rounded-full">
                    ${props.quantity}
                </div>
            </div>
            <div class="flex-1 md:flex-auto">
                <h5 class="text-sm font-medium mb-1">${props.info.title}${props.variant ? ` > ${props.variant.title}` : ""}</h5>
                <div class="flex flex-col text-muted-foreground"><span class="text-sm">${formatPrice(props.type === "DEFAULT" ? props.pricing.price : props.variant.price)}</span></div>
            </div>
            <div class="md:ml-auto flex items-center gap-2">
                <div class="relative flex items-center w-40">
                    <button data-action="remove-quantity" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary/10 border-2 border-primary/30 hover:bg-primary/30 absolute left-3 w-8 h-8" type="button">-</button>
                    <input data-action="change-quantity" class="flex h-12 w-full rounded-md border-2 border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-center" value="${props.quantity}">
                    <button data-action="add-quantity" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary/10 border-2 border-primary/30 hover:bg-primary/30 absolute right-3 w-8 h-8" type="button">+</button>
                </div>
                    <button data-action="remove-item" class="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-500 text-white shadow-sm hover:bg-destructive/90 h-10 w-10" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function PricingItem({ label, value }) {
    return `
        <li class="flex justify-between">
            <div>${label}</div>
            <span>${value}</span>
        </li>
    `;
}

function handleChangeField(event) {
    formData.payer[event.target.getAttribute("name").split(".")[1]] = event.target.value || undefined;
    event.target.classList.remove("border-red-500");
}

function Field({ id, placeholder }) {
    return `
        <input class="flex w-full rounded-md border-2 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 h-10"
            type="text"
            name="payer.${id}"
            placeholder="${placeholder}"
            onchange="handleChangeField(event)"
        >
    `;
}

(() => {
    function handler() {
        const productsListElement = checkoutElement.querySelector("#products-list");
        productsListElement.innerHTML = "";

        CartHelper.items.map((item) => {
            productsListElement.innerHTML += ProductItem(item);
        });

        setupCartListeners();
    }

    function calculatePricing() {
        const subTotal = CartHelper.items.reduce(
            (acc, item) =>
                acc + (item.type === "DEFAULT" ? item.pricing.price * item.quantity : item.variant.price * item.quantity),
            0,
        );
        let total = subTotal;

        const elements = [
            PricingItem({
                label: "Sub Total:",
                value: formatPrice(subTotal),
            }),
        ];

        if (formData.coupon) {
            if (formData.coupon.discount.type === "FIXED") total = total - formData.coupon.discount.amount;
            else total = total - total * (formData.coupon.discount.amount / 100);

            elements.push(
                PricingItem({
                    label: "Cupom:",
                    value: `-${formData.coupon.discount.type === "FIXED" ? formatPrice(formData.coupon.discount.amount) : `${formData.coupon.discount.amount}%`}`,
                }),
            );
        }

        checkoutElement.querySelector("#pricing").innerHTML = [
            ...elements,
            PricingItem({ label: "Total:", value: formatPrice(total) }),
        ].join("");
        checkoutElement.querySelector("#pay-button span").innerHTML = formatPrice(total);
    }

    function handleCoupon() {
        const couponElement = checkoutElement.querySelector("#coupon");

        let couponCode = null;

        const buttonElement = couponElement.querySelector("button");

        const buttonOriginalHtml = buttonElement.innerHTML;
        const buttonOriginalClassnames = buttonElement.className;

        const inpuElement = couponElement.querySelector("input");

        const { execute } = useAction({
            handle: async () => await Mginex.getCoupon(couponCode),
            onError: (error) => {
                couponElement.querySelector("span").innerHTML = `Não foi possível encontrar o cupom, código: ${error.message}`;
            },
            onSuccess: (data) => {
                couponElement.querySelector("span").innerHTML = "";
                formData.coupon = data;
                toast.success(`Cupom (${couponCode}) aplicado com sucesso!`);

                buttonElement.innerHTML = "Remover cupom";
                buttonElement.classList.remove("bg-primary", "hover:bg-primary/80", "shadow-primary/30");
                buttonElement.classList.add("bg-red-500", "hover:bg-red-500/80", "shadow-red-500/30");
                calculatePricing();
            },
        });

        inpuElement.addEventListener("change", (e) => {
            couponCode = e.target.value;
            if (!couponCode) couponElement.querySelector("button").disabled = true;
            else couponElement.querySelector("button").disabled = false;

            clearErrors();
        });

        buttonElement.addEventListener("click", async (e) => {
            if (!formData.coupon) {
                e.target.disabled = true;
                await execute();
                e.target.disabled = false;
            } else {
                formData.coupon = null;
                buttonElement.className = buttonOriginalClassnames;
                buttonElement.innerHTML = buttonOriginalHtml;
                calculatePricing();
                toast.success("Cupom removido com sucesso!");
            }
        });
    }
    handleCoupon();

    function handleCreatePersonalInfo() {
        const element = checkoutElement.querySelector("#personal-info");

        const gateway = gateways.find((gateway) => gateway.name === formData.paymentMethod);
        if (!gateway) return;

        const fields = [
            `<div class="grid lg:grid-cols-2 gap-3">
                ${Field({ id: "name", placeholder: "Primeiro nome" })}
                ${Field({ id: "surname", placeholder: "Sobrenome" })}
            </div>`,
        ];

        if (gateway.requiredFields.includes("email")) fields.push(Field({ id: "email", placeholder: "E-mail" }));
        if (gateway.requiredFields.includes("cpf")) fields.push(Field({ id: "cpf", placeholder: "CPF" }));

        element.innerHTML = fields.join(" ");
    }

    function handleSelectPaymentMethod() {
        checkoutElement.querySelectorAll("[data-payment-method]").forEach((element, index) => {
            const paymentMethod = element.getAttribute("data-payment-method");

            element.addEventListener("click", (event) => {
                if (event.target.getAttribute("data-state") === "active") return;

                if (formData.paymentMethod)
                    checkoutElement
                        .querySelector(`[data-payment-method="${formData.paymentMethod}"]`)
                        .setAttribute("data-state", "false");

                formData.paymentMethod = paymentMethod;
                element.setAttribute("data-state", "active");

                handleCreatePersonalInfo();
            });

            if (index === 0) element?.click();
        });
    }
    handleSelectPaymentMethod();

    function handleSubmit() {
        const { execute } = useAction({
            handle: async (utmParams) =>
                await Mginex.placeOrder({
                    items: CartHelper.cart.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        fields: item.fields,
                    })),
                    referenceCode: null,
                    couponCode: formData.coupon?.code,
                    paymentMethod: formData.paymentMethod,
                    payer: formData.payer,
                    utmParams,
                }),
            onError: (err) => {
                if (err.message === "GatewayNotFoundError") return toast.error("Escolha um método de pagamento");
                else if (err.message === "StockQuantityAvailableNotEnoughError")
                    return toast.error("Algum item do carrinho não possui mais estoque disponível para compra.");
                else if (err.message.startsWith("MissingPayerField:") || err.message.includes("Invalid email")) {
                    const field = err.message.includes("Invalid email") ? "email" : err.message.split(":")[1];
                    document.querySelector(`input[name='payer.${field}']`)?.classList.add("border-red-500");
                    return toast.error(
                        `O campo ${field === "name" ? "nome" : field === "surname" ? "sobrenome" : field} deve ser preenchido para continuar!`,
                    );
                } else toast.error(`Não foi possível prosseguir, código de erro: ${err.message}`);
            },
            onSuccess: (data) => {
                toast.success("Pedido criado com sucesso, agora estamos aguardando o pagamento...");

                if (data.isApproved) window.location.href = `/order/${data.orderId}`;
                else {
                    if (formData.paymentMethod === "PIX") window.location.href = `/payments/${data.orderId}`;
                    else {
                        window.open(data.payment.paymentLink, "_blank");
                        window.location.href = `/order/${data.orderId}`;
                    }
                }
            },
        });

        checkoutElement.querySelector("#pay-button").addEventListener("click", async (event) => {
            let utmParams = null;

            if (window.utmParams) {
                utmParams = {};
                window.utmParams.forEach((value, key) => {
                    utmParams[key.split("utm_")[1]] = value || null;
                });
            }

            const currentHtml = event.target.innerHTML;
            event.target.disabled = true;
            event.target.innerHTML = Spinner({ size: 8 });
            await execute(utmParams);
            event.target.disabled = false;
            event.target.innerHTML = currentHtml;
        });
    }
    handleSubmit();

    window.addEventListener("DOMContentLoaded", () => {
        handler();
        calculatePricing();
    });
    window.addEventListener("cart-items-updated", () => {
        handler();
        calculatePricing();
        if (CartHelper.cart.length < 1) window.location.href = "/";
    });
    if (CartHelper.cart.length < 1) window.location.href = "/";
})();
