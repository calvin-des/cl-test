/* Castle Lite survey. Load on questions.html with <script src="assets/js/survey.js" defer></script>. */
(function () {
    "use strict";

    var STORAGE_KEY = "castleLiteSurvey";
    var FORM_URL = "form.html";
    var QUESTIONS = [
        {
            id: "question_1",
            text: "How appealing do you find the idea of Castle Lite Draught in a Bottle?",
            maxSelections: 1,
            options: [
                "Very appealing",
                "Quite appealing",
                "Neither appealing nor unappealing",
                "Not very appealing",
                "Not at all appealing"
            ]
        },
        {
            id: "question_2",
            text: "Before today, were you aware that Castle Lite was launching Draught in a Bottle?",
            maxSelections: 1,
            options: ["Yes", "No"]
        },
        {
            id: "question_3",
            text: "Which of the following occasions would you most likely enjoy Castle Lite Draught in a Bottle? (Select up to 2)",
            maxSelections: 2,
            options: [
                "Relaxing after work at home",
                "Watching sport at home",
                "Braaiing at home",
                "Socialising with friends at home",
                "Relaxing at home over the weekend",
                "Other"
            ]
        },
        {
            id: "question_4",
            text: "What is the biggest benefit of Castle Lite Draught in a Bottle for you?",
            maxSelections: 1,
            options: [
                "Enjoy draught beer at home",
                "More convenient than going to a bar",
                "Feels more premium",
                "Something new to try",
                "Fits my lifestyle",
                "No particular benefit"
            ]
        },
        {
            id: "question_5",
            text: "After receiving this bottle today, how likely are you to drink it at home within the next week?",
            maxSelections: 1,
            options: [
                "Definitely will",
                "Probably will",
                "Might or might not",
                "Probably won't",
                "Definitely won't"
            ]
        }
    ];

    function newState() {
        return { version: 1, currentQuestion: 0, answers: {}, completed: false };
    }

    function readState() {
        var state = newState();

        try {
            var stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
            if (!stored || stored.version !== 1 || !stored.answers ||
                typeof stored.answers !== "object") {
                return state;
            }

            // Only restore known options, without duplicates or excess selections.
            QUESTIONS.forEach(function (question) {
                var values = stored.answers[question.id];
                if (!Array.isArray(values)) {
                    return;
                }

                state.answers[question.id] = values.filter(function (value, index) {
                    return question.options.some(function (_option, optionIndex) {
                        return value === "option_" + (optionIndex + 1);
                    }) && values.indexOf(value) === index;
                }).slice(0, question.maxSelections);
            });

            var firstUnanswered = QUESTIONS.findIndex(function (question) {
                return !state.answers[question.id] || state.answers[question.id].length === 0;
            });
            var lastAllowed = firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered;
            if (Number.isInteger(stored.currentQuestion) && stored.currentQuestion >= 0) {
                state.currentQuestion = Math.min(stored.currentQuestion, lastAllowed);
            }
            state.completed = stored.completed === true && firstUnanswered === -1;
        } catch (_error) {
            // Malformed data or unavailable storage must not break the survey.
        }

        return state;
    }

    function initialiseSurvey() {
        var container = document.querySelector(".survey-page .survey-content");
        if (!container) {
            return;
        }

        var form = container.querySelector("form");
        var fieldset = form && form.querySelector(".survey-question");
        var legend = fieldset && fieldset.querySelector("legend");
        var answers = fieldset && fieldset.querySelector(".survey-answers");
        var count = container.querySelector(".question-count");
        var nextButton = form && form.querySelector('button[type="submit"]');

        if (!form || !fieldset || !legend || !answers || !count || !nextButton ||
            form.dataset.surveyInitialised === "true") {
            return;
        }

        form.dataset.surveyInitialised = "true";
        // One consistent validation message for both radio and checkbox questions.
        form.noValidate = true;
        count.setAttribute("aria-live", "polite");
        count.setAttribute("aria-atomic", "true");
        legend.tabIndex = -1;

        var error = document.createElement("p");
        error.id = "survey-error";
        error.className = "survey-error text-danger small mt-2";
        error.setAttribute("role", "alert");
        error.hidden = true;
        fieldset.appendChild(error);

        var state = readState();
        var originalDescription = fieldset.getAttribute("aria-describedby") || "";

        function saveState() {
            try {
                // Retained in this browser tab for refreshes and the form page.
                // This does not submit answers to a server.
                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (_error) {
                // Continue in memory when browser storage is unavailable.
            }
        }

        function selectedValues() {
            return Array.from(answers.querySelectorAll("input:checked"), function (input) {
                return input.value;
            });
        }

        function clearError() {
            error.hidden = true;
            error.textContent = "";
            fieldset.removeAttribute("aria-invalid");
            if (originalDescription) {
                fieldset.setAttribute("aria-describedby", originalDescription);
            } else {
                fieldset.removeAttribute("aria-describedby");
            }
        }

        function showError(message, focusInput) {
            error.textContent = message;
            error.hidden = false;
            fieldset.setAttribute("aria-invalid", "true");
            fieldset.setAttribute("aria-describedby", (originalDescription + " " + error.id).trim());
            if (focusInput) {
                answers.querySelector("input").focus();
            }
        }

        function renderQuestion(moveFocus) {
            var question = QUESTIONS[state.currentQuestion];
            var savedAnswers = state.answers[question.id] || [];
            var multiple = question.maxSelections > 1;

            clearError();
            count.textContent = "Question " + (state.currentQuestion + 1) + " of " + QUESTIONS.length;
            legend.textContent = question.text;
            nextButton.textContent = "Next";
            answers.replaceChildren();

            question.options.forEach(function (option, index) {
                var value = "option_" + (index + 1);
                var id = question.id + "-" + value;
                var label = document.createElement("label");
                var input = document.createElement("input");
                var text = document.createElement("span");

                label.className = "survey-option";
                label.htmlFor = id;
                input.className = "form-check-input";
                input.type = multiple ? "checkbox" : "radio";
                input.name = question.id;
                input.id = id;
                input.value = value;
                input.checked = savedAnswers.indexOf(value) !== -1;
                input.required = !multiple && index === 0;
                text.className = "form-check-label";
                text.textContent = option;

                label.appendChild(input);
                label.appendChild(text);
                answers.appendChild(label);
            });

            if (moveFocus) {
                legend.focus({ preventScroll: true });
                count.scrollIntoView({ block: "nearest", behavior: "auto" });
            }
        }

        answers.addEventListener("change", function (event) {
            var input = event.target;
            if (!(input instanceof HTMLInputElement)) {
                return;
            }

            var question = QUESTIONS[state.currentQuestion];
            if (selectedValues().length > question.maxSelections) {
                input.checked = false;
                showError("Please select no more than " + question.maxSelections + " answers.", false);
                return;
            }

            clearError();
            state.answers[question.id] = selectedValues();
            state.completed = false;
            saveState();
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var question = QUESTIONS[state.currentQuestion];
            var values = selectedValues();
            if (values.length === 0) {
                showError("Please select an answer before continuing.", true);
                return;
            }
            if (values.length > question.maxSelections) {
                showError("Please select no more than " + question.maxSelections + " answers.", true);
                return;
            }

            state.answers[question.id] = values;
            if (state.currentQuestion === QUESTIONS.length - 1) {
                state.completed = true;
                saveState();
                window.location.assign(FORM_URL);
                return;
            }

            state.currentQuestion += 1;
            state.completed = false;
            saveState();
            renderQuestion(true);
        });

        renderQuestion(false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialiseSurvey, { once: true });
    } else {
        initialiseSurvey();
    }
}());
