import React from 'react';
import XLSX from 'xlsx';
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
                const workbook = XLSX.read(buffer, { type: 'buffer', bookVBA: true })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const data = XLSX.utils.sheet_to_json(worksheet)
                this.setState({ excelData: data })
                this.setState({ keys: Object.keys(data[0]) })
                this.setState({ searchTarget: Object.keys(data[0])[0] })

                var tokenizedExcelData = new Array();
                data.map((doc) => {
                    var tokenizedDoc = new Object();
                    var key = Object.keys(doc)
                    key.map((k) => {
                        tokenizedDoc[k] = this.tokenizeText(doc[k])
                    })
                    tokenizedExcelData.push(tokenizedDoc)
                })
                this.setState({ tokenizedExcelData: tokenizedExcelData })
            })
        }
    }

    selectMenu() {
        return (
            this.state.keys.map((key) => {
                return <option value={key}>{key}</option>
            })
        );
    }

    searchDocs(keyword) {
        const keywords = this.tokenizeText(keyword)
        const isHit = this.state.tokenizedExcelData.map((doc, _) => {
            var targetDoc = doc[this.state.searchTarget]
            var hitDoc = targetDoc.filter((sent, _) => {
                var hits = keywords.filter((keySent, _) => {
                    if (distance(sent, keySent) <= 1) {
                        return true
                    }
                })
                if (hits.length > 0) {
                    return true
                }
            })
            if (hitDoc.length > 0) {
                return true
            }
        })

        return this.state.excelData.filter((doc, index) => {
            return isHit[index]
        })
    }

    renderTableCell(item) {
        return this.state.keys.map((key) => {
            return (
                <th className="item">
                    {item[key]}
                </th>
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
        return this.state.keys.map((key) => {
            return (
                <th className="header">
                    {key}
                </th>
            );
        })
    }

    renderTable(items) {
        return (
            <table className="items">
                <tr key="header">
                    {this.renderTableCellHeader()}
                </tr>
                {this.renderTableComponent(items)}
            </table>
        );
    }

    tokenizeText(text) {
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
