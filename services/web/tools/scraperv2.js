const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const textTags = [
	"p", "ul", "ol", "li", "span", "div", "table", "td", "th", "tr", "caption",
	"h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "q", "cite", "abbr", "address",
	"article", "aside", "figcaption", "figure", "footer", "header", "nav", "section",
	"summary", "time", "mark", "strong", "em", "i", "b", "u", "s", "small", "sup",
	"sub", "code", "pre", "samp", "kbd", "var", "dfn", "del", "ins"
];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractTextFromElement(el, response, section = "main") {
	if (el.type === "text") {
	let text = el.data.replace(/\r?\n|\r|\t/g, "").trim();
	let parentTag = el.parent.tagName;
	if (text.length > 0 && !response.sections[section][parentTag]?.includes(text)) {
		response.sections[section][parentTag] = response.sections[section][parentTag] || [];
		response.sections[section][parentTag].push(text);
	}
	} else if (el.type === "tag" && el.children) {
	if (el.tagName === "aside" || el.attribs?.class?.includes("sidebar")) {
		section = "sidebar";
	} else if (el.tagName === "footer") {
		section = "footer";
	}
	el.children.forEach((child) => extractTextFromElement(child, response, section));
	}
}

exports.scrapeHTMLWithRetries = async (url, maxRetries = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const result = await scrapeHTML(url);
            return result;
        } catch (error) {
            retries++;
            console.log(`Error in scrapeHTML. Retrying (${retries}/${maxRetries}):`, error);
            await delay(3000 * retries); // Wait before retrying (e.g., 3s, 6s, 9s)
        }
    }
    throw new Error(`Failed to scrapeHTML after ${maxRetries} retries.`);
};

exports.scrapeHTML = async (url) => {
	try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
            ],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.3');
        await page.goto("https://" + url, { waitUntil: "networkidle2" });
        const body = await page.content();
        await browser.close();
		const $ = cheerio.load(body);
		let response = {
			inboundLinks: [],
			outboundLinks: [],
			images: [],
			imageUrls: [],
			headers: [],
			lists: [],
			text: {},
			sections: {
				main: {},
				sidebar: {},
				footer: {},
			},
			metadata: {
				title: "",
				description: "",
				keywords: [],
			},
		};
		$("a").each((i, el) => {
			let link = $(el).attr("href");
			let title = $(el).attr("title");
			let linkObj = { url: link, title: title || "" };
			if (link.includes(url)) {
				if (!response.inboundLinks.some((item) => item.url === link)) {
					response.inboundLinks.push(linkObj);
				}
			} else {
				if (!response.outboundLinks.some((item) => item.url === link)) {
					response.outboundLinks.push(linkObj);
				}
			}
		});
		$("img, [style*=background], link[rel=stylesheet]").each((i, el) => {
			let image = $(el).attr("src") || $(el).attr("href");
			let alt = $(el).attr("alt") || "";
			let dimensions = {
				width: parseInt($(el).attr("width"), 10) || null,
				height: parseInt($(el).attr("height"), 10) || null,
			};
			let imageObj = { url: image, alt: alt, dimensions: dimensions, type: "content" };
			if (image && !response.images.some((img) => img.url === image)) {
				// Determine image type based on dimensions
				if (dimensions.width && dimensions.height) {
					if (dimensions.width <= 64 && dimensions.height <= 64) {
						imageObj.type = "icon";
					} else if (dimensions.width >= 728 || dimensions.height >= 90) {
						imageObj.type = "banner";
					} else if (dimensions.width === dimensions.height) {
						imageObj.type = "square";
					} else if (dimensions.width > dimensions.height) {
						imageObj.type = "landscape";
					} else {
						imageObj.type = "portrait";
					}
				}
				// Determine image type based on file format
				if (image.toLowerCase().endsWith('.svg')) {
					imageObj.type = 'svg';
				}
				// Determine if the image is a background
				if ($(el).attr("style") || $(el).prop("tagName").toLowerCase() === 'link') {
					imageObj.type = "background";
				}
				response.images.push(imageObj);
			}
		});
		textTags.forEach((tag) => {
			$(tag).each((i, el) => {
			extractTextFromElement(el, response);
			});
		});
		response.metadata.title = $("title").text();
		let metaDescription = $('meta[name="description"]').attr("content");
		if (metaDescription) {
			response.metadata.description = metaDescription;
		}
		let metaKeywords = $('meta[name="keywords"]').attr("content");
		if (metaKeywords) {
			response.metadata.keywords = metaKeywords.split(",").map((keyword) => keyword.trim());
		}
		return response;
	} catch (error) {
		console.error("Error in scrapeHTML:", error);
		throw error;
	}
};
