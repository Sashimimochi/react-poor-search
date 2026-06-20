import React from 'react';
import { read, utils } from 'xlsx';
import './styles.css';

const DEFAULT_THRESHOLD = 1;
const DEFAULT_KEYS = ['検索対象を選ぶ'];
const N_GRAM_SIZE = 3;

function createNGrams(text, size = N_GRAM_SIZE) {
    if (text.length < size) {
        return [];
    }

    return Array.from({ length: text.length - size + 1 }, (_, index) => text.slice(index, index + size));
}

function calculateLevenshteinDistance(a, b) {
    if (a === b) {
        return 0;
    }

    if (a.length === 0) {
        return b.length;
    }

    if (b.length === 0) {
        return a.length;
    }

    const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
    const currentRow = new Array(b.length + 1);

    for (let i = 0; i < a.length; i += 1) {
        currentRow[0] = i + 1;

        for (let j = 0; j < b.length; j += 1) {
            const substitutionCost = a[i] === b[j] ? 0 : 1;
            currentRow[j + 1] = Math.min(
                currentRow[j] + 1,
                previousRow[j + 1] + 1,
                previousRow[j] + substitutionCost,
            );
        }

        previousRow.splice(0, previousRow.length, ...currentRow);
    }

    return previousRow[b.length];
}

class ReactPoorSearch extends React.Component {
    constructor(props) {
        super(props);

        this.fileInput = React.createRef();
        this.state = {
            hitItems: [],
            fileName: '',
            excelData: [],
            searchKeyword: '',
            searchTarget: '',
            keys: DEFAULT_KEYS,
            tokenizedExcelData: [],
            threshold: this.getInitialThreshold(props),
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleReadFile = this.handleReadFile.bind(this);
        this.handleSearchTargetChange = this.handleSearchTargetChange.bind(this);
        this.handleTriggerReadFile = this.handleTriggerReadFile.bind(this);
    }

    getInitialThreshold(props) {
        if (typeof props.threshold === 'number') {
            return props.threshold;
        }
        return DEFAULT_THRESHOLD;
    }

    handleChange(event) {
        const searchKeyword = event.target.value;

        this.setState((prevState) => ({
            searchKeyword,
            hitItems: this.searchDocs(searchKeyword, prevState),
        }));
    }

    handleSearchTargetChange(event) {
        const searchTarget = event.target.value;

        this.setState((prevState) => {
            const nextState = {
                ...prevState,
                searchTarget,
            };

            return {
                searchTarget,
                hitItems: this.searchDocs(prevState.searchKeyword, nextState),
            };
        });
    }

    handleTriggerReadFile() {
        if (this.fileInput.current) {
            this.fileInput.current.click();
        }
    }

    handleReadFile(fileObj) {
        if (!fileObj) {
            return;
        }

        this.setState({ fileName: fileObj.name });
        fileObj.arrayBuffer().then((buffer) => {
            const workbook = read(buffer, { type: 'buffer', bookVBA: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const data = utils.sheet_to_json(worksheet);
            const keys = this.extractKeys(data);
            const searchTarget = keys[0] || '';
            const tokenizedExcelData = data.map((doc) => this.tokenizeDocument(doc, keys));

            this.setState((prevState) => {
                const nextState = {
                    ...prevState,
                    excelData: data,
                    keys: keys.length > 0 ? keys : DEFAULT_KEYS,
                    searchTarget,
                    tokenizedExcelData,
                };

                return {
                    excelData: data,
                    keys: keys.length > 0 ? keys : DEFAULT_KEYS,
                    searchTarget,
                    tokenizedExcelData,
                    hitItems: this.searchDocs(prevState.searchKeyword, nextState),
                };
            });
        });
    }

    extractKeys(data) {
        if (data.length === 0) {
            return [];
        }
        return Object.keys(data[0]);
    }

    tokenizeDocument(doc, keys) {
        return keys.reduce((tokenizedDoc, key) => {
            tokenizedDoc[key] = this.tokenizeText(doc[key]);
            return tokenizedDoc;
        }, {});
    }

    selectMenu() {
        return this.state.keys.map((key) => (
            <option value={key} key={key}>{key}</option>
        ));
    }

    searchDocs(keyword, state = this.state) {
        const keywords = this.tokenizeText(keyword);

        if (keywords.length === 0 || !state.searchTarget) {
            return [];
        }

        return state.tokenizedExcelData
            .map((doc, index) => ({
                index,
                score: this.calculateDocumentScore(doc[state.searchTarget], keywords),
            }))
            .filter(({ score }) => score <= state.threshold)
            .sort((a, b) => a.score - b.score)
            .map(({ index }) => state.excelData[index]);
    }

    calculateDocumentScore(targetTokens = [], keywordTokens) {
        const distances = [];

        keywordTokens.forEach((keywordToken) => {
            targetTokens.forEach((targetToken) => {
                distances.push(calculateLevenshteinDistance(targetToken, keywordToken));
            });
        });

        return this.calcMin(distances);
    }

    calcMin(list) {
        if (list.length === 0) {
            return Infinity;
        }
        return list.reduce((a, b) => Math.min(a, b));
    }

    renderTableCell(item) {
        return this.state.keys.map((key) => (
            <td className="item" key={key}>
                {item[key]}
            </td>
        ));
    }

    renderTableComponent(items) {
        return items.map((item, index) => (
            <tr key={index}>
                {this.renderTableCell(item)}
            </tr>
        ));
    }

    renderTableCellHeader() {
        return this.state.keys.map((key) => (
            <th className="header" key={key}>
                {key}
            </th>
        ));
    }

    renderTable(items) {
        return (
            <table className="items">
                <thead>
                    <tr>
                        {this.renderTableCellHeader()}
                    </tr>
                </thead>
                <tbody>
                    {this.renderTableComponent(items)}
                </tbody>
            </table>
        );
    }

    tokenizeText(text) {
        const normalizedText = this.normalizeText(text);
        if (normalizedText.length === 0) {
            return [];
        }

        const tokens = createNGrams(normalizedText);
        return tokens.length > 0 ? tokens : [normalizedText];
    }

    normalizeText(text) {
        if (text === null || typeof text === 'undefined') {
            return '';
        }
        return String(text).toLowerCase();
    }

    render() {
        return (
            <div>
                <div className="">
                    <select
                        value={this.state.searchTarget || this.state.keys[0]}
                        onChange={this.handleSearchTargetChange}
                        className="styled-select"
                    >
                        {this.selectMenu()}
                    </select>
                </div>
                <form action="">
                    <input className="textbox" type="text" placeholder="検索したいキーワードを入力してください" onChange={this.handleChange} />
                </form>
                <h3 className="subtitle">ヒットしたデータ一覧</h3>
                {this.renderTable(this.state.hitItems)}
                <button className="btn btn-border" onClick={this.handleTriggerReadFile}>
                    Import
                </button>
                <form style={{ display: 'none' }}>
                    <input
                        type="file"
                        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        ref={this.fileInput}
                        onChange={(e) => {
                            e.preventDefault();
                            this.handleReadFile(e.currentTarget.files[0]);
                        }}
                    />
                </form>
                <h3 className="subtitle">読み込みデータ一覧</h3>
                {this.renderTable(this.state.excelData)}
            </div>
        );
    }
}

export default ReactPoorSearch;
