class Dialog {
    constructor() {
        this.activeDialogs = new Set();
        this.init();
    }

    init() {
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("dialog-overlay")) {
                const dialogId = e.target.id.replace("dialog-overlay-", "");
                this.closeDialog(dialogId);
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.activeDialogs.size > 0) {
                const lastDialog = Array.from(this.activeDialogs).pop();
                this.closeDialog(lastDialog);
            }
        });

        document.querySelectorAll(".dialog").forEach((element) => {
            element.addEventListener("click", (event) => {
                if (event.target === element) this.closeDialog(element.id.split("dialog-")[1]);
            });
        });
    }

    openDialog(dialogId) {
        const element = document.getElementById(`dialog-${dialogId}`);
        element.style.display = "flex";
        element.setAttribute("data-state", "open");
        this.activeDialogs.add(dialogId);
    }

    closeDialog(dialogId) {
        const element = document.getElementById(`dialog-${dialogId}`);
        element.setAttribute("data-state", "closed");
        setTimeout(() => {
            element.style.display = "none";
        }, 400);

        this.activeDialogs.delete(dialogId);
    }
}

const dialog = new Dialog();
dialog.init();

function openDialog(dialogId) {
    dialog.openDialog(dialogId);
}

function closeDialog(dialogId) {
    dialog.closeDialog(dialogId);
}
