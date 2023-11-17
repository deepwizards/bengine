const cheerio = require('cheerio');
const https = require("https");

exports.scraper = async (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let body = "";
            res.on("data", chunk => {
                body += chunk;
            });
            res.on("end", () => {
                const $ = cheerio.load(body);
                let response = {
                    inboundLinks: [],
                    outboundLinks: [],
                    images: [],
                    imageUrls: [],
                    headers: [],
                    lists: [],
                    text: [],
                    structure: ""
                }
                $('a').each((i, el) => {
                    let link = $(el).attr('href');
                    if (link.includes(url)) {
                        if (!response.inboundLinks.includes(link)) {
                            response.inboundLinks.push(link);
                        } 
                    } else {
                        if (!response.outboundLinks.includes(link)) {
                            response.outboundLinks.push(link);
                        }
                    }
                });
                $('img, [style*=background], link[rel="stylesheet"]').each((i, el) => {
                    let image = $(el).attr('src');
                    if (!response.images.includes(image)) {
                        response.images.push(image);
                        response.imageUrls.push(image);
                    }
                });                
                let imageRegEx = /(https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)|(^\/.*\.(?:png|jpg|jpeg|svg|gif)))/gi;
                let imageMatches = body.match(imageRegEx);
                if(imageMatches) {
                    imageMatches.forEach(img => {
                        if(!response.imageUrls.includes(img)) {
                            response.imageUrls.push(img);
                        }
                    });
                }                
                $('h1,h2,h3,h4,h5,h6').each((i, el) => {
                    let header = $(el).text().replace(/\r?\n|\r/g, "");
                    if (!response.headers.includes(header)) {
                        response.headers.push(header);
                    }
                });
                let text = "";
                $('p,ul,li').each((i, el) => {
                    text = $(el).text().replace(/\r?\n|\r|\t/g, ""); // remove tabs from text
                    if (el.tagName === "ul") {
                        response.lists.push(text);
                        text = "";
                    }
                    if (el.tagName === "p") {
                        response.text.push(text);
                    }
                });
                let structure = "";
                const $html = cheerio.load(body);
                $html('body *').each((i, el) => {
                    let id = $(el).attr('id');
                    let className = $(el).attr('class'); 
                    structure += `<${el.tagName}${id ? ` id="${id}"` : ''}${className ? ` class="${className}"` : ''}>`
                });
                response.structure = structure;
                resolve(response);
            });
            res.on("error", err => {
                reject(err);
            });
        });
    });
};
