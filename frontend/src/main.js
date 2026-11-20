import "../css/style.css";

// Poster hero: scale each line so it spans its column edge to edge,
// then size the big number to match the height of the lines beside it.
const poster = document.querySelector(".poster");
if (poster) {
	const fitPoster = () => {
		poster.querySelectorAll(".fit").forEach((line) => {
			line.style.fontSize = "100px";
			const target = line.parentElement.clientWidth;
			line.style.fontSize = `${(100 * target) / line.scrollWidth}px`;
		});
		const left = poster.querySelector(".poster-left");
		const num = poster.querySelector(".poster-num");
		if (left && num) {
			const column = num.clientWidth;
			num.style.fontSize = "100px";
			num.style.width = "max-content";
			const byWidth = (100 * column) / num.offsetWidth;
			num.style.width = "";
			num.style.fontSize = `${Math.min(left.offsetHeight / 0.74, byWidth)}px`;
		}
	};
	fitPoster();
	document.fonts?.ready.then(fitPoster);
	new ResizeObserver(fitPoster).observe(poster);
}

document.querySelectorAll(".deliverables").forEach((list) => {
	const details = document.createElement("details");
	const summary = document.createElement("summary");

	details.className = "deliverables-details";
	summary.textContent = "View deliverables";
	const parent = list.parentNode;
	parent.replaceChild(details, list);
	details.append(summary, list);
});

const assistant = document.querySelector("#chat-fab");
const toggle = document.querySelector("#chat-toggle");
const close = document.querySelector("#chat-close-btn");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const messages = document.querySelector("#chat-messages");

if (assistant && toggle && close && form && input && messages) {
	const TOPICS = ["Ugyard", "DX Time", "DX Key", "Face recognition", "Embedded and IoT", "How Mervyn works"];

	// Returns { text, related } — related are follow-up questions shown as chips.
	const answer = async (question) => {
		try {
			const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(question)}&limit=3`);
			if (response.ok) {
				const [best, ...rest] = await response.json();
				if (best) return { text: best.summary, title: best.title, related: rest.map((match) => match.title) };
			}
		} catch {
			// Fall through to the offline answers below.
		}

		const text = question.toLowerCase();
		if (/contact|email|hire|available|price|cost|rate/.test(text)) {
			return { text: "Mervyn is available for select projects. Email mervynstunner@gmail.com with what you're building, what's blocked and your timeline. He usually replies within a few hours.", related: [] };
		}
		return {
			text: "I don't have details on that yet. Mervyn can answer it directly at mervynstunner@gmail.com, or try one of these:",
			related: TOPICS,
		};
	};

	const addMessage = (content, role, { title, related = [] } = {}) => {
		const message = document.createElement("div");
		message.className = `msg msg-${role}`;
		if (title) {
			const heading = document.createElement("strong");
			heading.className = "msg-title";
			heading.textContent = title;
			message.append(heading);
		}
		message.append(document.createTextNode(content));
		messages.appendChild(message);

		if (related.length) {
			const chips = document.createElement("div");
			chips.className = "msg-related";
			for (const topic of related) {
				const chip = document.createElement("button");
				chip.type = "button";
				chip.textContent = topic;
				chip.addEventListener("click", () => send(topic));
				chips.append(chip);
			}
			messages.appendChild(chips);
		}
		// Scroll only the chat, to the top of the newest message.
		messages.scrollTo({ top: message.offsetTop - messages.offsetTop - 8, behavior: "smooth" });
	};

	const send = async (question) => {
		const cleanQuestion = question.trim();
		if (!cleanQuestion) return;
		input.value = "";
		addMessage(cleanQuestion, "user");
		const reply = await answer(cleanQuestion);
		addMessage(reply.text, "bot", reply);
	};

	toggle.addEventListener("click", () => {
		const isOpen = assistant.classList.toggle("chat-open");
		toggle.setAttribute("aria-expanded", String(isOpen));
	});
	close.addEventListener("click", () => {
		assistant.classList.remove("chat-open");
		toggle.setAttribute("aria-expanded", "false");
	});
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		send(input.value);
	});
	document.querySelectorAll("[data-prompt]").forEach((button) => {
		button.addEventListener("click", () => send(button.dataset.prompt));
	});
}
