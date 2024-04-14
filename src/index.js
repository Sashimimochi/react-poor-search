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

                var tokenizedExcelData = new Array();
                var kanjiOnlyExcelData = new Array();
                data.map((doc) => {
                    var tokenizedDoc = new Object();
                    var kanjiOnlyDoc = new Object();
                    var key = Object.keys(doc)
                    key.map((k) => {
                        tokenizedDoc[k] = this.tokenizeText(doc[k])
                        kanjiOnlyDoc[k] = this.extract_kanji(doc[k])
                    })
                    tokenizedExcelData.push(tokenizedDoc)
                    kanjiOnlyExcelData.push(kanjiOnlyDoc)
                })
                this.setState({ tokenizedExcelData: tokenizedExcelData })
                this.setState({ kanjiOnlyExcelData: kanjiOnlyExcelData })
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
        const threshold = 1;

        const kjScores = this.kanjiSearch(keyword)
        const keywords = this.tokenizeText(keyword)
        const scores = [];
        const isHit = this.state.tokenizedExcelData.map((doc, idx) => {
            var targetDoc = doc[this.state.searchTarget]
            var dists = [];
            var hitDoc = targetDoc.filter((sent, _) => {
                keywords.map((keySent, _) => {
                    dists.push(distance(sent, keySent));
                })
                if (this.calcMin(dists) <= threshold || kjScores[idx] == 0) {
                    return true
                }
            })
            scores.push({ index: idx, score: this.calcMin(dists), kjscore: kjScores[idx] });
            if (hitDoc.length > 0) {
                return true
            }
        })

        const sortedScores = this.sortScore(scores)
        const sortedIsHit = sortedScores.map((score, _) => {
            return isHit[score.index]
        })
        const sortedDocs = sortedScores.map((score, _) => {
            return this.state.excelData[score.index]
        })

        const hitDocs = sortedDocs.filter((_, index) => {
            return sortedIsHit[index]
        })
        return hitDocs
    }

    kanjiSearch(keyword) {
        const kjKeyword = this.extract_kanji(keyword)
        const kjHitDocs = this.state.kanjiOnlyExcelData.map((doc, _) => {
            var targetDoc = doc[this.state.searchTarget]
            if (targetDoc.search(kjKeyword) !== -1) {
                return 0
            } else {
                return 1
            }
        })
        return kjHitDocs;
    }

    calcMin(list) {
        if (list.length > 0) {
            return list.reduce((a, b) => Math.min(a, b))
        }
        return list
    }

    sortScore(list) {
        list.sort(function (a, b) {
            if (a.kjscore != b.kjscore) {
                if (a.kjscore < b.kjscore) {
                    return -1;
                }
                if (a.kjscore > b.kjscore) {
                    return 1;
                }
            }
            if (a.score != b.score) {
                return a.score - b.score;
            }
            return 0;
        });
        return list;
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

    extract_kanji(text) {
        const regexp = /([\u{3005}\u{3007}\u{303b}\u{3400}-\u{9FFF}\u{F900}-\u{FAFF}\u{20000}-\u{2FFFF}][\u{E0100}-\u{E01EF}\u{FE00}-\u{FE02}]?)/mug;
        const res = text.match(regexp)
        if (res !== null) {
            return res.join("")
        }
        return ""
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
