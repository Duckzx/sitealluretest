(() => {
    const chatElement = document.getElementById("chat");
    if (!chatElement) return;

    const chatContainer = chatElement.querySelector("#chat-messages");

    let messages = [];
    let chatData = null;

    const chatId = chatElement.getAttribute("chat-id");

    function generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    const { execute } = useAction({
        handle: async () => await Mginex.getChat(chatId),
        onError: (err) => {
            toast.error(`Houve um erro ao tentar carregar o chat, código: ${err.message}`);
        },
        onSuccess: (data) => {
            chatData = data;
        },
    });

    const { execute: refetchMessages } = useAction({
        handle: async () => await Mginex.getChatMessages(chatId),
        onError: (err) => {
            toast.error(`Houve um erro ao tentar carregar as mensagens do chat, código: ${err.message}`);
        },
        onSuccess: (data) => {
            messages = data;
            createChatMessages();
        },
    });

    function formatTime(timestamp) {
        return timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function createChatMessages() {
        chatContainer.innerHTML = "";

        const messageGroups = groupMessagesByTime(messages);
        messageGroups.forEach((group) => {
            const timeElement = document.createElement("div");
            timeElement.className = "text-sm text-muted-foreground text-center my-3";
            timeElement.textContent = formatTime(new Date(group.timestamp));
            chatContainer.appendChild(timeElement);

            const groupContainer = document.createElement("div");
            groupContainer.className = "flex items-end gap-3";

            if (group.sender === "THEM") {
                const userElement = document.createElement("div");
                userElement.className = "relative flex shrink-0 overflow-hidden w-8 h-8 rounded-full";

                const userAvatar = document.createElement("img");
                userAvatar.src = "<%= store.theme.logo %>";
                userAvatar.alt = "<%= store.settings.title %>";
                userAvatar.className = "h-12 h-12 rounded-full object-cover";

                userElement.appendChild(userAvatar);

                groupContainer.appendChild(userElement);
            }

            const messagesContainer = document.createElement("div");
            messagesContainer.className = "space-y-1 flex-1";

            group.messages.forEach((message, index) => {
                const messageContainer = document.createElement("div");
                messageContainer.className = `flex w-full group ${group.sender === "ME" && "justify-end"}`;

                const messageWrapper = document.createElement("div");
                messageWrapper.className = "max-w-[50%]";

                const direction = group.sender === "ME" ? "r" : "l";

                const messageBubble = document.createElement("div");
                messageBubble.className = `p-3 ${group.sender === "ME" ? "bg-primary text-primary-foreground" : "bg-secondary"} flex flex-col group rounded-3xl ${group.messages.length === 1 ? "" : index === 0 ? `rounded-b${direction}-none` : index < group.messages.length - 1 ? `rounded-${direction}-none` : `rounded-t${direction}-none`}`;

                const messageElement = document.createElement("div");
                messageElement.className = "text-[0.9rem] break-all whitespace-pre-wrap";
                messageElement.innerHTML = message.content;

                messageBubble.appendChild(messageElement);
                messageWrapper.appendChild(messageBubble);
                messageContainer.appendChild(messageWrapper);
                messagesContainer.appendChild(messageContainer);
            });

            groupContainer.appendChild(messagesContainer);

            chatContainer.appendChild(groupContainer);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function groupMessagesByTime(messages) {
        const groups = [];
        let currentGroup = null;

        messages.forEach((message) => {
            const messageTime = new Date(message.createdAt);
            const shouldCreateNewGroup =
                !currentGroup ||
                currentGroup.sender !== message.sender ||
                messageTime - new Date(currentGroup.timestamp) > 5 * 60 * 1000; // 5 minutos

            if (shouldCreateNewGroup) {
                currentGroup = {
                    timestamp: message.createdAt,
                    sender: message.sender,
                    messages: [message],
                };
                groups.push(currentGroup);
            } else {
                currentGroup.messages.push(message);
            }
        });

        return groups;
    }

    const buttonElement = chatElement.querySelector("button");
    const inputElement = chatElement.querySelector("input");

    function sendMessage(content) {
        if (!content) return;

        inputElement.value = "";
        buttonElement.disabled = true;

        const tempMessageId = generateUUID();

        messages.push({
            id: tempMessageId,
            createdAt: new Date(),
            updatedAt: new Date(),
            chatId: chatId,
            type: "USER",
            authorId: null,
            authorType: "USER",
            content: content,
            attachments: [],
            sender: "ME",
        });

        createChatMessages();

        const { execute } = useAction({
            handle: async () =>
                await Mginex.sendMessage(chatId, {
                    content,
                    attachments: [],
                }),
            onError: (err) => {
                toast.error(`Houve um erro ao tentar enviar sua mensagem, código: ${err.message}`);
                messages = messages.filter((message) => message.id !== tempMessageId);
                createChatMessages();
            },
            onSuccess: (err) => {},
        });
        execute();
    }

    execute();
    refetchMessages();

    inputElement.addEventListener("change", (event) => {
        const value = event.target.value;

        if (!value) buttonElement.disabled = true;
        else buttonElement.disabled = false;
    });

    inputElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter") sendMessage(event.target.value);
    });

    let typingTimer;
    const typingDelay = 600;
    let isTyping = false;

    inputElement.addEventListener("input", () => {
        if (!isTyping) {
            isTyping = true;
            startTypingRequest();
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            stopTypingRequest();
        }, typingDelay);
    });

    const { execute: sendTypingIndicator } = useAction({
        handle: async (data) => await Mginex.sendTypingIndicator(chatId, data),
        onError: () => {},
        onSuccess: () => {},
    });
    function startTypingRequest() {
        sendTypingIndicator({ isTyping: true });
    }

    function stopTypingRequest() {
        sendTypingIndicator({ isTyping: false });
    }

    buttonElement.addEventListener("click", () => {
        sendMessage(inputElement.value);
    });

    socket.on("chat:message.created", (data) => {
        messages.push(data);
        createChatMessages();
    });

    socket.on("chat:typing-indicator", (data) => {
        if (data.chatId !== chatId) return;

        if (data.isTyping) {
            const typingIndicator = document.createElement("div");
            typingIndicator.innerHTML = "O suporte está digitando...";
            typingIndicator.className = "text-sm text-muted-foreground my-3";
            typingIndicator.id = "typing-indicator";
            chatContainer.appendChild(typingIndicator);
        } else {
            const typingIndicator = chatContainer.querySelector("#typing-indicator");
            if (typingIndicator) chatContainer.removeChild(typingIndicator);
        }
    });

    window.addEventListener("socket-connect", () => {
        if (!socket?.connected) return;

        socket.emit("join-chat-room", {
            chatId,
        });
    });
})();
