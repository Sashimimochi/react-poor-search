import React from 'react';
import { read, utils } from 'xlsx';
import './styles.css';
import { distance } from 'fastest-levenshtein';
import { trigram } from 'n-gram';

class ReactPoorSearch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hitItems: [],
            fileInput: {
                current: null
            },
            fileName: "",
            excelData: [],
            searchTarget: "question",
            keys: ["検索対象を選ぶ"],
            tokenizedExcelData: [],
            threshold: 1
        };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({
            hitItems: this.searchDocs(event.target.value.toLowerCase())
        });
    }

    handleTriggerReadFile() {
        if (this.state.fileInput.current) {
            this.state.fileInput.current.click();
        }
    };

    handleReadFile(fileObj) {
        if (fileObj) {
            this.setState({ fileName: fileObj.name })
            fileObj.arrayBuffer().then((buffer) => {
                const workbook = read(buffer, { type: 'buffer', bookVBA: true })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const data = utils.sheet_to_json(worksheet)
                this.setState({ excelData: data })
                this.setState({ keys: Object.keys(data[0]) })
                this.setState({ searchTarget: Object.keys(data[0])[0] })

                const tokenizedExcelData = data.map((doc) => {
                    const tokenizedDoc = {};
                    const keys = Object.keys(doc);
                    keys.forEach((key) => {
                        tokenizedDoc[key] = this.tokenizeText(doc[key]);
                    });
                    return tokenizedDoc;
                });
                this.setState({ tokenizedExcelData: tokenizedExcelData });
            })
        }
    }

    selectMenu() {
        return (
            this.state.keys.map((key, index) => {
                return <option key={index} value={key}>{key}</option>
            })
        );
    }

    searchDocs(keyword) {
        const { tokenizedExcelData, searchTarget, excelData, threshold } = this.state;
        const keywords = this.tokenizeText(keyword);
        
        const scores = tokenizedExcelData.map((doc, idx) => {
            const targetDoc = doc[searchTarget] || [];
            const dists = keywords.flatMap((keySent) => 
                targetDoc.map((sent) => distance(sent, keySent))
            );
            return { index: idx, score: this.calcMin(dists) };
        });

        return scores
            .filter(({ score }) => score <= threshold)
            .sort((a, b) => a.score - b.score)
            .map(({ index }) => excelData[index]);
    }

    calcMin(list) {
        if (list.length > 0) {
            return list.reduce((a, b) => Math.min(a, b))
        }
        return Number.MAX_SAFE_INTEGER; // Return high value when no distances calculated
    }

    renderTableCell(item) {
        return this.state.keys.map((key, index) => {
            return (
                <td key={index} className="item">
                    {item[key]}
                </td>
            );
        })
    }

    renderTableComponent(items) {
        return items.map((item, index) => {
            return (
                <tr key={index}>
                    {this.renderTableCell(item)}
                </tr>)
        });
    }

    renderTableCellHeader() {
        return this.state.keys.map((key, index) => {
            return (
                <th key={index} className="header">
                    {key}
                </th>
            );
        })
    }

    renderTable(items) {
        return (
            <table className="items">
                <tbody>
                    <tr key="header">
                        {this.renderTableCellHeader()}
                    </tr>
                    {this.renderTableComponent(items)}
                </tbody>
            </table>
        );
    }

    tokenizeText(text) {
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        return trigram(text)
    }

    render() {
        return (
            <div>
                <div className="">
                    <select
                        onChange={(e) => this.setState({ searchTarget: e.target.value })}
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
                <button className="btn btn-border" onClick={() => this.handleTriggerReadFile()}>
                    Import
                </button>
                <form style={{ display: 'none' }}>
                    <input
                        type="file"
                        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        ref={this.state.fileInput}
                        onChange={(e) => {
                            e.preventDefault()
                            this.handleReadFile(e.currentTarget.files[0])
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
