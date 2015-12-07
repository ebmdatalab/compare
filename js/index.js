(function() {

    var total_trial_count = 0,
        total_prespec_unreported = 0,
        total_nonprespec_reported = 0,
        total_correct_outcomes = 0,
        total_all_outcomes = 0;
    not_public_str = 'Not yet public';

    var assessment_tooltip = "We give the journal four weeks to publish the trial.";
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
        { "data": "trial",
          "title": "Trial",
          "width": "20%",
        },
        { "data": "trialpublicationdate",
          "title": "Trial published"
        },
        { "data": "linktoassessment",
          "title": "Our assessment",
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
          "title": 'Undeclared non-prespecified outcomes reported<span data-toggle="tooltip" title="' + nonprespec_tooltip +'"> <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span></span>',
          "type": "num",
          "render": {
            "_": "display",
            "sort": "sort"
          }
        },
        { "data": "lettersent",
          "title": 'Letter sent<span data-toggle="tooltip" title="' + letter_tooltip +'"> <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span></span>',
        },
        { "data": "letterpublished",
          "title": "Letter published?"
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

                for (var k in d) {
                    if (d.hasOwnProperty(k)) {
                        d[k] = (typeof(d[k]) === 'string') ? $.trim(d[k]): d[k];
                    }
                }


                total_trial_count += 1;

                // Title and publication date.
                d.trial = "<strong>" + d.journalname + "</strong>: <a target='_blank' href='";
                d.trial += d.linktoonlinetrialreport + "'>";
                d.trial += (d.trialtitle.length > 100) ? d.trialtitle.substring(0, 100) + '...' : d.trialtitle;
                d.trial += "</a>";
                d.trialpublicationdate = parseDate(d.publicationdate);

                // Calculate data for outcomes columns, and add to running counts.
                // Parse numerator for prespecified outcomes column.
                var primary_correct = d.numberofprespecifiedprimaryoutcomescorrectlyreported,
                    secondary_correct = d.numberofprespecifiedsecondaryoutcomescorrectlyreported,
                    primary_elsewhere = d.numberofprespecifiedprimaryoutcomesreportedsomewhereinthepublicationotherthatmainresultstable,
                    secondary_elsewhere = d.numberofprespecifiedsecondaryoutcomesreportedsomewhereinthepublicationotherthanmainresultstable;
                d.correct_outcomes = (primary_correct) ? primary_correct : 0;
                d.correct_outcomes += (secondary_correct) ? secondary_correct : 0;
                d.correct_outcomes += (primary_elsewhere) ? primary_elsewhere : 0;
                d.correct_outcomes += (secondary_elsewhere) ? secondary_elsewhere : 0;
                total_correct_outcomes += d.correct_outcomes;

                // Parse denominator for prespecified outcomes column.
                var total_primary = d.totalnumberofprespecifiedprimaryoutcomes,
                    total_secondary = d.totalnumberofprespecifiedsecondaryoutcomes;
                d.all_outcomes = (total_primary) ? total_primary : 0;
                d.all_outcomes += (total_secondary) ? total_secondary : 0;
                total_all_outcomes += d.all_outcomes;
                total_prespec_unreported += (d.all_outcomes - d.correct_outcomes);

                // Parse numerator and denominator into final values for sort and display.
                d.outcomes_str = {};
                d.outcomes_str.sort = (d.all_outcomes > 0) ? (d.correct_outcomes / d.all_outcomes) * 100 : 0;
                d.outcomes_str.display = d.correct_outcomes + '/' + d.all_outcomes + ' (' + Math.round(d.outcomes_str.sort * 10) / 10 + '%)';

                // Parse non-prespecified outcomes column.
                var non_prespecified = d['totalnumberofnon-prespecifiedoutcomesreported'],
                    non_prespecified_ok = d['numberofnon-prespecifiedoutcomescorrectlyreportedienoveloutcomesbutdescribedassuchinthepaper'];
                var val = (non_prespecified) ? non_prespecified : 0;
                val -= (non_prespecified_ok) ? non_prespecified_ok: 0;
                d.non_prespecified_outcomes = {
                    'sort': val,
                    'display': val
                };
                total_nonprespec_reported += val;

                d.lettersentdate = parseDate(d.lettersentdate);
                d.letterpublisheddate = parseDate(d.letterpublisheddate);

                // Show friendly strings where required.
                if (d['finaldecision-letterrequired'] === 'No') {
                    d.linktoletter = 'Letter not required';
                    d.lettersentdate = 'n/a';
                    d.letterpublisheddate = 'n/a';
                }

                // Finally, configure how much data to display.
                d.show = (d.letterstatus !== '');

                // Show letter date (and link to letter) if appropriate.
                if (d.linktoletter === 'Letter not required') {
                    d.lettersent = d.linktoletter;
                } else {
                    d.lettersent = d.lettersentdate;
                    if (d.show && d.linktoletter) {
                        d.lettersent += " <a target='_blank' href='" + d.linktoletter + "'>";
                        d.lettersent += "Read online</a>";
                    }
                }
                // Other columns to remove if trial is not yet public.
                if (d.show) {
                    d.linktoassessment = "<a href='" + d.linktoassessment + "'>Read online</a>";
                    d.letterpublished = (d.letterstatus === 'Letter published') ? d.letterpublisheddate : d.letterstatus;
                } else {
                    d.linktoassessment = not_public_str;
                    d.letterpublished = '';
                    d.outcomes_str = {
                        'sort': -1,
                        'display': not_public_str
                    };
                    d.non_prespecified_outcomes = {
                        'sort': -1,
                        'display': not_public_str
                    };
                }
            },
            callback: function(data, tabletop) {
                drawTable(data);
                $("#total_trial_count").html('<strong>' + total_trial_count + '</strong>');
                var mean_prespec_propn = (total_correct_outcomes / total_all_outcomes) * 100;
                $("#mean_prespec_propn").html('<strong>' + Math.round(mean_prespec_propn * 10) / 10 + '%</strong>');
                var mean_nonprespec_count = total_nonprespec_reported / total_trial_count;
                $('#mean_nonprespec_count').html('<strong>' + Math.round(mean_nonprespec_count * 10) / 10 + '</strong>');
                $('#total_prespec_unreported').html('<strong>' + total_prespec_unreported + '</strong>');
                $('#total_nonprespec_reported').html('<strong>' + total_nonprespec_reported + '</strong>');

            }
        });

        function parseDate(str) {
            // Parse dates into YYYY-MM-DD, for sorting purposes.
            var parts = str.split("/"), dt;
            if (parts.length > 1) {
                dt = new Date(parseInt(parts[2], 10),
                  parseInt(parts[1], 10) - 1,
                  parseInt(parts[0], 10));
                str = dt.getFullYear() + "/";
                str += ('0' + (dt.getMonth()+1)).slice(-2) + "/";
                str += ('0' + dt.getDate()).slice(-2);
            }
            return str;
        }
        function drawTable(data){
            var html = '<table class="table table-bordered table-hover ';
            html += '" id="myTable" width="100%"></table>';
            $('#table').html(html);
            $("#myTable").DataTable({
                data: data,
                columns: columns,
                order:[[0, "asc"]],
                paging : true,
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