#! /usr/bin/env node
let _ = require('lodash');

const Constants = {
    'section': "items",
    'RECTANGLE': "rect"
}

function rgba2hex(orig) {
    if (orig) {
        var a, isPercent, hex =
            (orig.r * 255 | 1 << 8).toString(16).slice(1) +
            (orig.g * 255 | 1 << 8).toString(16).slice(1) +
            (orig.b * 255 | 1 << 8).toString(16).slice(1)
        // (orig.a * 255 | 1 << 8).toString(16).slice(1)  
        return "#" + hex;
    }
    return null
}
const mapping = require("./mapping.json")

const overRideTextStyles = (template) => {
    let _items = []
    let startIndex = 0;
    let endIndex = 1;
    let startChar = template.characterStyleOverrides[0]
    for (; endIndex <= template.characterStyleOverrides.length; endIndex++) {
        if (template.characterStyleOverrides[endIndex] !== startChar) {
            let props = {}
            if (template.styleOverrideTable[startChar]) {
                props.fonts = {};
                styles = template.styleOverrideTable[startChar];
                if (styles.fontSize) {
                    props.fonts.size = styles.fontSize;
                }
                if (styles.fontWeight) {
                    // Figma will return font weight like 400, 700 something like this
                    // But we need to apply "bold" "normal"
                    props.fonts.weight = styles.fontWeight == 700 ? "bold" : "normal";
                } else if (template.style.fontWeight == 700) {
                    props.fonts.weight = "bold" // Error in Nano PDF template need to always apply bold
                }
                if (styles.fills && styles.fills[0].color) {
                    props.fonts.color = rgba2hex(styles.fills[0].color);
                }
                if (styles.textDecoration) {
                    props.decoration = {
                        type: "underline"
                    }
                }
            } else if (template.style.fontWeight == 700) {
                props.fonts = { weight: "bold" } // Error in Nano PDF Template need to always apply bold
            }
            _items.push(
                {
                    label: template.characters.slice(startIndex, endIndex),
                    ...props
                }
            )
            startChar = template.characterStyleOverrides[endIndex];
            startIndex = endIndex;
        }
    }
    last_ = template.characters.slice(startIndex)
    if (last_) {
        _items.push({
            label: last_
        })
    }
    return _items;
}

const checkTemplate = (template, parent = null) => {
    if (template.type == "FRAME" && template.layoutPositioning == "ABSOLUTE") {
        return {
            type: "section",
            position: { x: _.round(template.absoluteBoundingBox.x - parent.absoluteBoundingBox.x), y: _.round(template.absoluteBoundingBox.y - parent.absoluteBoundingBox.y) },
            items: []
        }
    } else if (template.name.startsWith("Cell")) {
        let properties = template.name.split("|");
        let numberOfChildren = template.children.filter(c => c.visible!==false).length
        let child = template.children[0];
        let type = null;
        let extras = {};
        if (template.visible == false || numberOfChildren==0) {
            if (template.visible==false) {
                return "";
            }
            return {
                border: [false, false, false, false]
            };
        }
        if (numberOfChildren == 1 && child) {
            if (child.type == "TEXT") {
                type = "label";
                // let regex = RegExp(/{{(a-zA-Z0-9._)}}/)
                // let findDynamic = regex.exec(child.characters);
                // if (findDynamic) {
                //     child.characters = mapping[child.characters.replace("-dy-", "")];
                // }
                extras = {
                    fonts: {
                        size: child.style.fontSize,
                        color: rgba2hex(child.fills[0].color),
                        weight: child.style.fontWeight == 700 ? "bold" : ""
                    },
                    alignment: child.style.textAlignHorizontal.toLowerCase(),
                    margin: [
                        template.paddingLeft || 0, template.paddingTop, template.paddingRight || 0, template.paddingBottom || 0
                    ]
                }
                if (child.characterStyleOverrides.length == 0) {
                    let regex = RegExp(/{{(a-zA-Z0-9._)}}/)
                    let findDynamic = regex.exec(child.characters);
                    if (findDynamic) {
                        child.characters = child.characters.replace(findDynamic[0], mapping[findDynamic[1]])
                    }
                    extras.label = child.characters
                } else {
                    extras = { ...extras, items: overRideTextStyles(child) };
                }
            } else if (child.type == "RECTANGLE") {
                if (child.absoluteBoundingBox.width == 1) {
                    child.absoluteBoundingBox.height -= 3;
                }
                if (child.fills[0].type == "IMAGE") {
                    type = "image";
                    extras.image = child.fills[0].imageRef;
                } else {
                    type = "rect";
                    extras.color = rgba2hex(child.fills[0].color);
                }
                extras.height = child.absoluteBoundingBox.height, extras.width = child.absoluteBoundingBox.width;
                extras.margin = [
                    (template.paddingLeft / 2) || 0, (template.paddingTop > 2) ? template.paddingTop - 2 : 0, (template.paddingRight / 2) || 0, (template.paddingBottom > 2) ? template.paddingBottom - 2 : 0 || 0
                ]
            } else if (child.name.startsWith("UList") || child.name.startsWith("OList")) {
                let options = child.name.split("|");
                type = options[0].toLowerCase();
                extras.items = [];
                if (options[1]) {
                    extras.subType = options[1];
                }
                extras.margin = [
                    template.paddingLeft || 0, template.paddingTop, template.paddingRight || 0, template.paddingBottom || 0
                ]
            } else if (child.name.startsWith("Table")) {
                type = "section"
                extras = {
                    margin: [
                        template.paddingLeft || 0, template.paddingTop || 0, template.paddingRight || 0, template.paddingBottom || 0
                    ]
                }
                extras.items = []
            }
        } else {
            type = "section"
            extras = {
                margin: [
                    template.paddingLeft || 0, template.paddingTop || 0, template.paddingRight || 0, template.paddingBottom || 0
                ]
            }
            if (numberOfChildren > 1) {
                extras.items = []
            }
        }
        if (parseInt(properties[1]) > 1) {
            extras.colSpan = parseInt(properties[1]);
        }
        if (parseInt(properties[2]) > 1) {
            extras.rowSpan = parseInt(properties[2]);
        }
        if (template.fills.length > 0) {
            extras.fillColor = rgba2hex(template.fills[0].color)
        }
        if (template.strokes.length > 0 && (template.strokeWeight>0 || template.individualStrokeWeights)) {
            let sw = 'individualStrokeWeights';
            if (template.individualStrokeWeights) {
                extras.border = [_.get(template, sw + '.left', 0) != 0, _.get(template, sw + '.top', 0) != 0, _.get(template, sw + '.right', 0) != 0, _.get(template, sw + '.bottom', 0) != 0]
            } else {
                extras.border = [true, true, true, true];
            }
        } else {
            extras.border = [false, false, false, false];
        }

        return {
            type,
            ...extras,
        }
    } else if (template.name.startsWith("UList")) {
        let options = template.name.split("|")
        extras = {}
        if (options[1]) {
            extras.subType = options[1]
        }
        return {
            type: "ulist",
            items: [],
            ...extras
        }
    } else if (template.name.startsWith("OList")) {
        let options = template.name.split("|")
        extras = {}
        if (options[1]) {
            extras.subType = options[1]
        }
        return {
            type: "olist",
            items: [],
            ...extras
        }
    } else if ((template.type == "FRAME" || template.name == "Header" || template.name=="Footer" || template.name == "Section" || template.name == "Table") && (template.layoutAlign == "STRETCH" || (template.layoutAlign == "INHERIT" && parent && parent.layoutAlign == "STRETCH"))) {
        let paddingBottom = 0;
        if (template.paddingBottom) {
            paddingBottom += template.paddingBottom
        }
        if (parent && parent.itemSpacing) {
            paddingBottom += parent.itemSpacing
        }
        if (template.absoluteBoundingBox.height && template.layoutMode == 'HORIZONTAL') {
            paddingBottom += template.absoluteBoundingBox.height
        }
        let type = 'section'
        let items = []
        let extras = {}
        if (template.name == "Table" || template.children.every(i => i.name == "Cell" || i.name == "Row")) {
            type = 'table'
            if (template.children[0].name.startsWith("Cell")) {
                paddingBottom -= template.absoluteBoundingBox.height
                items.push([])
                extras.widths = template.children.map(i => _.floor(i.absoluteBoundingBox.width) - (template.children[0].strokeWeight * 2))
            } else if (template.children[0].name.startsWith("Row")) {
                for (let inx in template.children) {
                    items.push([]);
                }
                let rowLength = template.children.map(child => {
                    return child.children.filter(c => c.visible !== false).length
                });
                let maxRowLength = Math.max(...rowLength);
                let rowToUse = rowLength.indexOf(maxRowLength);
                extras.widths = template.children[rowToUse].children.map(i => _.floor(i.absoluteBoundingBox.width) - (template.children[0].strokeWeight * 2))
            }
            childWithStroke = template.children.find(i => i.strokes.length > 0);
            if (childWithStroke) {
                extras.border = {
                    color: [rgba2hex(childWithStroke.strokes[0].color), rgba2hex(childWithStroke.strokes[0].color)],
                    width: [_.round(childWithStroke.strokeWeight), _.round(childWithStroke.strokeWeight)]
                }
            }
        }
        return {
            type,
            margin: [
                template.paddingLeft || 0, template.paddingTop || 0, template.paddingRight || 0, paddingBottom
            ],
            background: rgba2hex(_.get(template, 'fills.0.color', null)),
            items,
            ...extras
        }
    } else if (template.type == 'RECTANGLE') {
        let type = null;
        let extras = {}
        if (template.absoluteBoundingBox.width == 1) {
            template.absoluteBoundingBox.height -= 3
        }
        if (template.fills[0].type == "IMAGE") {
            type = "image";
            extras.image = template.fills[0].imageRef
        } else {
            type = "rect";
            extras.color = rgba2hex(template.fills[0].color)
        }
        return {
            type,
            height: template.absoluteBoundingBox.height,
            width: template.absoluteBoundingBox.width,
            ...extras,
            ...((parent.layoutMode == 'HORIZONTAL' || template.layoutPositioning == 'ABSOLUTE') ? { position: { x: _.round(template.absoluteBoundingBox.x - parent.absoluteBoundingBox.x), y: _.round(template.absoluteBoundingBox.y - parent.absoluteBoundingBox.y) } } : null)
        }
    } else if (template.type == "TEXT") {
        let props = {}
        if (parent.layoutPositioning == "ABSOLUTE") {
            props.position = { x: _.round(template.absoluteBoundingBox.x - parent.absoluteBoundingBox.x), y: _.round(template.absoluteBoundingBox.y - parent.absoluteBoundingBox.y) }
        } else if (parent.type == "FRAME" && parent.layoutAlign != 'STRETCH') {
            props.position = { y: _.round(template.absoluteRenderBounds.y - parent.absoluteRenderBounds.y) }
            props.position.y -= (parent.absoluteBoundingBox.height + 6)
        }
        if (template.style) {
            props.fonts = {
                color: rgba2hex(template.fills[0].color),
            }
            if (template.style.fontSize!==6) {
                props.fonts.size = template.style.fontSize;
            }
            if (template.style.fontWeight==700) {
                props.fonts.weight = "bold";
            }
        }
        props.alignment = template.style.textAlignHorizontal.toLowerCase()
        if (template.characterStyleOverrides.length == 0) {
            if (parent.name.startsWith("OList") || parent.name.startsWith("UList")) {
                let labels  = template.characters.split("\n");
                let label_list = []
                for (label of labels) {
                    label_list.push({
                        label,
                        ...props
                    });
                }
                return label_list;
            }
            return {
                label: template.characters,
                ...props
            }
        } else {
            let _items = overRideTextStyles(template);
            return {
                type: "label",
                items: _items,
                ...props
            }
        }
    }
}

const parseContent = (curr_object, template, set_at = 'content', parent = null) => {
    let setAt = _.get(curr_object, set_at)
    // console.log(setAt, curr_object, set_at)
    if (Array.isArray(setAt)) {
        if (Array.isArray(template)) {
            for (let templ of template) {
                if (templ.layoutAlign == "INHERIT") {
                    templ.layoutAlign = parent.layoutAlign
                }
                let content = checkTemplate(templ, parent)
                if (Array.isArray(content)) {
                    setAt.push(...content);
                } else {
                    setAt.push(content);
                }
                if (templ.children && templ.children.length > 0) {
                    if (content && content.type !== "label") {
                        let key = "items";
                        if (content.type == "table") {
                            if (templ.children[0].name.startsWith("Row")) {
                                for (let indx in templ.children) {
                                    key = "items." + indx;
                                    parseContent(content, templ.children[indx].children, key, templ)
                                }
                            } else if (templ.children[0].name.startsWith("Cell")) {
                                key = "items.0"
                                parseContent(content, templ.children, key, templ)
                            }
                        } else {
                            parseContent(content, templ.children, key, templ)
                        }
                    }
                }
            }
        } else {
            if (template.layoutAlign == "INHERIT") {
                template.layoutAlign = parent.layoutAlign
            }
            let content = checkTemplate(template)
            if (Array.isArray(content)) {
                setAt.push(...content);
            } else {
                setAt.push(content)
            }
            if (template.children && template.children.length > 0) {
                let key = "items";
                if (content.type !== "label") {
                    if (content.type == "table") {
                        if (template.children[0].name.startsWith("Row")) {
                            for (let indx in template.children) {
                                key = "items." + indx;
                                parseContent(content, template.children[indx].children, key, template)
                            }
                        } else if (template.children[0].name.startsWith("Cell")) {
                            key = "items.0"
                            parseContent(content, template.children, key, template)
                        }
                    } else {
                        parseContent(content, template.children, key, template)
                    }
                }
            }
        }
    } else if (typeof setAt == 'object') {
        _.set(curr_object, set_at, checkTemplate(template))
        setAt = _.get(curr_object, set_at)
        if (template.children && template.children.length > 0) {
            key = setAt.type == "table" ? "items.0" : "items"
            parseContent(setAt, template.children, key, template)
        }
    }
}

let template_object = {
    "type": "pdf",
    "info": "Sales Illustration",
    images: {
    },
    styles: {

    },
    defaultStyle: {
        lineHeight: 1,
        fonts: {
            size: 6,
            family: "FWDCircular"
        }
    },
    pages: [

    ]
}

const http = require("https")

const downloadTemplate = (done_count, image_count, images) => {
    let image_name = Object.keys(images)[done_count];
    template_object.images[image_name] = "data:";
    http.get(images[image_name], (res) => {
        template_object.images[image_name] += res.headers['content-type'] + ";base64,"
        res.setEncoding("base64");
        res.on('data', (chunk) => {
            template_object.images[image_name] += chunk
        });
        res.on('end', () => {
            done_count++;
            if (done_count == image_count) {
                process_templace()
            } else {
                downloadTemplate(done_count, image_count, images)
            }
        })
    })
}

const process_templace = () => {
    let figma = require("./figma.json")
    let figma_response = figma.document.children[0]
    let template = figma_response.children[0];
    let header = template.children.find(i => i.name == "Header");
    let content = template.children.find(i => i.name == "Content");
    let footer = template.children.find(i => i.name == "Footer");
    let page_object = {}
    template_object.pages.push(page_object)
    if (header) {
        page_object.header = {}
        parseContent(page_object, header, 'header')
    }
    if (footer) {
        page_object.footer = {}
        parseContent(page_object,footer, 'footer')
    }
    if (content) {
        page_object.pageMargins = [
            0, _.get(header, 'absoluteBoundingBox.height', 30), 0, _.get(footer, 'absoluteBoundingBox.height', 0)
        ]
        page_object.content = []
        parseContent(page_object, content, 'content')
        page_object.content[0].pageBreak = "after";
        for (let pageIndex=1; pageIndex<=5; pageIndex++) {
            content = figma.document.children[pageIndex].children[0].children.find(i => i.name == "Content");
            parseContent(page_object, content, "content");
            if (pageIndex<5) {
                page_object.content[pageIndex].pageBreak="after";
            }
        }
    }
    fs = require('fs');
    fs.writeFile('output.json', JSON.stringify(template_object), () => {
        console.log("Done")
    })
    // console.log(JSON.stringify(template_object))
}

const init = () => {
    let figma_images = require("./figma_files.json")
    if (figma_images.status == 200) {
        let done_count = 0;
        let images = figma_images.meta.images;
        let image_count = Object.keys(images).length;
        downloadTemplate(done_count, image_count, images)
    }
}

init();