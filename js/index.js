(function() {

    var tableId = 'myTable';
    var prespec_tooltip = 'Out of all the outcomes that were specified in advance, ';
    prespec_tooltip += 'how many are reported in the final paper? This ';
    prespec_tooltip += 'should be 100%.';
    var nonprespec_tooltip = "How many outcomes are reported that weren\'t ";
    nonprespec_tooltip += "specified in advance, and aren\'t declared as such? ";
    nonprespec_tooltip += "This should be zero.";
    var letter_tooltip = "Sometimes we judge that no letter is ";
    letter_tooltip += "required, if the overall standard of outcome reporting is ";
    letter_tooltip += "sufficiently high.";

    var key = "1EgNcKJ_p4v7P0JNq5GSElKGvDX88z8QZN52n8C-yQAc";
    var columns = [
        { "data": "trialtitle",
          "title": "Trial",
          "width": "20%",
          "mRender": function (data, type, row) {
                var html = "<strong>" + row.journalname;
                html += "</strong>: <a target='_blank' href='";
                html += row.linktoonlinetrialreport + "'>";
                html += (row.trialtitle.length > 100) ? row.trialtitle.substring(0, 100) + '...' : row.trialtitle;
                html += "</a>";
                return html;
            }
        },
        { "data": "publicationdate",
          "title": "Publication date"
        },
        { "data": "linktoassessment",
          "title": "Our assessment",
          "mRender": function (data, type, row) {
                var html = '';
                if (row.linktoassessment) {
                    html = "<a target='_blank' href='" + row.linktoassessment + "'>";
                    html += "Read online</a>";
                }
                return html;
          },
          "orderable": false
        },
        { "data": "outcomes_str",
          "title": 'Prespecified outcomes reported<span data-toggle="tooltip" title="' + prespec_tooltip +'"> <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span></span>',
          "type": "num",
          "render": {
            "_": "display",
            "sort": "sort"
          }
        },
        { "data": "non_prespecified_outcomes",
          "title": 'Undeclared non-prespecified outcomes reported<span data-toggle="tooltip" title="' + nonprespec_tooltip +'"> <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span></span>'
        },
        { "data": "lettersentdate",
          "title": 'Letter sent<span data-toggle="tooltip" title="' + letter_tooltip +'"> <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span></span>',
          "mRender": function (data, type, row) {
                var html;
                if (row.linktoletter && (row.linktoletter !== 'Letter not required')) {
                    html = row.lettersentdate + " <a target='_blank' href='" + row.linktoletter + "'>";
                    html += "Read online</a>";
                } else {
                    html = row.linktoletter;
                }
                return html;
          }
        },
        { "data": "letterpublisheddate",
          "title": "Letter published"
        },
        { "data": "publicationdelay",
          "title": "Reasons for delay or complications"
        }
    ];

    $(document).ready(function() {

        // Truncate bios.
        $('.bio p').trunk8({
          fill: '&hellip; <a class="read-more" href="#">read more</a>',
          lines: 10
        });
        $(document).on('click', '.read-more', function (e) {
            e.preventDefault();
            $(this).parent().trunk8('revert').append(' <a class="read-less" href="#">read less</a>');
            return false;
        });
        $(document).on('click', '.read-less', function (e) {
            e.preventDefault();
            $(this).parent().trunk8();
            return false;
        });

        Tabletop.init({
            key: key,
            simpleSheet: true,
            parseNumbers: true,
            proxy: 'https://compare-trials.s3.amazonaws.com',
            postProcess: function(d) {

                // Parse dates into YYYY-MM-DD for string sorting purposes.
                d.publicationdate = parseDate(d.publicationdate);
                d.lettersentdate = parseDate(d.lettersentdate);
                if (d.letterpublisheddate !== 'Letter not published') {
                    d.letterpublisheddate = parseDate(d.letterpublisheddate);
                }

                // Parse numerator for prespecified outcomes column.
                var primary_correct = d.numberofprespecifiedprimaryoutcomescorrectlyreported,
                    secondary_correct = d.numberofprespecifiedsecondaryoutcomescorrectlyreported,
                    primary_elsewhere = d.numberofprespecifiedprimaryoutcomesreportedsomewhereinthepublicationotherthatmainresultstable,
                    secondary_elsewhere = d.numberofprespecifiedsecondaryoutcomesreportedsomewhereinthepublicationotherthanmainresultstable;
                d.correct_outcomes = (primary_correct) ? primary_correct : 0;
                d.correct_outcomes += (secondary_correct) ? secondary_correct : 0;
                d.correct_outcomes += (primary_elsewhere) ? primary_elsewhere : 0;
                d.correct_outcomes += (secondary_elsewhere) ? secondary_elsewhere : 0;

                // Parse denominator for prespecified outcomes column.
                var total_primary = d.totalnumberofprespecifiedprimaryoutcomes,
                    total_secondary = d.totalnumberofprespecifiedsecondaryoutcomes;
                d.all_outcomes = (total_primary) ? total_primary : 0;
                d.all_outcomes += (total_secondary) ? total_secondary : 0;

                // Parse numerator and denominator into string.
                d.outcomes_str = {};
                d.outcomes_str.sort = (d.all_outcomes > 0) ? (d.correct_outcomes / d.all_outcomes) * 100 : 0;
                d.outcomes_str.display = d.correct_outcomes + '/' + d.all_outcomes + ' (' + Math.round(d.outcomes_str.sort * 10) / 10 + '%)';

                // Parse non-prespecified outcomes column.
                var non_prespecified = d['totalnumberofnon-prespecifiedoutcomesreported'],
                    non_prespecified_ok = d['numberofprespecifiedsecondaryoutcomesreportedsomewhereinthepublicationotherthanmainresultstable'];
                d.non_prespecified_outcomes = (non_prespecified) ? non_prespecified : 0;
                d.non_prespecified_outcomes -= (non_prespecified_ok) ? non_prespecified_ok: 0;

                // Parse 'letter required' column.
                if (d['finaldecision-letterrequired'] === 'No') {
                    d.linktoletter = 'Letter not required';
                    d.lettersentdate = 'n/a';
                    d.letterpublisheddate = 'n/a';
                }
                if (!d.publicationdelay) {
                    d.publicationdelay = 'None';
                }
            },
            callback: function(data, tabletop) {
                drawTable(data);
            }
        });
        function parseDate(str) {
            var parts = str.split("/");
            var dt = new Date(parseInt(parts[2], 10),
              parseInt(parts[1], 10) - 1,
              parseInt(parts[0], 10));
            var dateStr = dt.getFullYear() + "/";
            dateStr += ('0' + (dt.getMonth()+1)).slice(-2) + "/";
            dateStr += ('0' + dt.getDate()).slice(-2);
            return dateStr;
        }
        function drawTable(data){
            var html = '<table class="table table-bordered table-hover ';
            html += '" id="' + tableId + '" width="100%"></table>';
            $('#table').html(html);
            $("#myTable").DataTable({
                data: data,
                columns: columns,
                order:[[1, "desc"]],
                paging : $("#" + tableId).find('tbody tr').length > 10,
                pagingType: "simple",
                responsive: true
            });
            $('body').tooltip({
                selector: '[data-toggle=tooltip]',
                placement: 'auto top'
            });
        }

    });

})();