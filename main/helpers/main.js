// randel random delay
exports.randel = (min, max) => {
    return new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 4000));
}

// repvar replaces variable
exports.repvar = (str, varname, varvalue) => {
    return str.replace(new RegExp(`{{${varname}}}`, 'g'), varvalue);
}
