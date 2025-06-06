sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, History, UIComponent, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("leave.management.controller.CreateLeaveRequest", {
        onInit: function () {
            this._oRouter = UIComponent.getRouterFor(this);
            this._oRouter.attachRouteMatched(this.onRouteMatched, this);

            // The below code is to handle the error messages from the backend in functions like onSubmit. 
            // The standard try catch does not work for this because the error is not thrown in the try block. 
            // In OData V4, when an error occurs during a ListBinding.create(), the error is not thrown in await oContext.created() if it's considered a transient error — it logs it in the console and retries the request unless you handle it explicitly.
            const oMessageManager = sap.ui.getCore().getMessageManager();
            const oMessageModel = oMessageManager.getMessageModel();

            oMessageModel.bindList("/").attachChange(function (oEvent) {
                const aMessages = oEvent.getSource().getContexts().map(oCtx => oCtx.getObject());

                const oErrorMessage = aMessages.find(msg => msg.type === "Error");
                if (oErrorMessage) {
                    MessageBox.error(oErrorMessage.message);
                }
            });

            // Register your view for message propagation
            oMessageManager.registerObject(this.getView(), true);
        },

        onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            if (sRouteName === "createLeaveRequest") {
                this._initializeForm();
            }
        },

        _initializeForm: function () {
            // Reset form fields
            this.byId("leaveTypeSelect").setSelectedKey("");
            this.byId("startDatePicker").setValue("");
            this.byId("endDatePicker").setValue("");
            this.byId("reasonTextArea").setValue("");
        },

        onDateChange: function (oEvent) {
            var oStartDate = this.byId("startDatePicker").getDateValue();
            var oEndDate = this.byId("endDatePicker").getDateValue();

            if (oStartDate && oEndDate && oStartDate > oEndDate) {
                MessageBox.warning("End date cannot be before start date");
                oEvent.getSource().setValueState("Error");
            } else {
                oEvent.getSource().setValueState("None");
            }
        },

        _formatDate: function(oDate) {
            if (!oDate) return null;
            
            // Get year, month and day parts
            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, '0');
            const day = String(oDate.getDate()).padStart(2, '0');
            
            // Return in YYYY-MM-DD format
            return `${year}-${month}-${day}`;
        },

        onSubmit: async function () {
            if (!this._validateForm()) return;
        
            try {
                const oModel = this.getView().getModel();
                const startDate = this._formatDate(this.byId("startDatePicker").getDateValue());
                const endDate = this._formatDate(this.byId("endDatePicker").getDateValue());
                
                // Get the list binding
                const oListBinding = oModel.bindList("/LeaveRequests");
                
                // Prepare the data
                const oData = {
                    startDate: startDate,
                    endDate: endDate,
                    type_code: this.byId("leaveTypeSelect").getSelectedKey(),
                    reason: this.byId("reasonTextArea").getValue()
                };

                // Remove all previousmessages from the message manager.
                // This avoids confusing the user with leftover errors from earlier actions.
                sap.ui.getCore().getMessageManager().removeAllMessages();

                // Create the context and set the data
                const oContext = oListBinding.create(oData);

                // Wait for the backend to respond
                await oContext.created();
                oModel.refresh();
                // Show success message and navigate back
                MessageBox.success("Leave request created successfully", {
                    onClose: () => {
                        this.onNavBack();
                        oModel.refresh();
                    }
                });
            } catch (error) {
                MessageBox.error(error.message);
            }
        },

        _validateForm: function () {
            var bValid = true;
            var oView = this.getView();

            // Validate leave type
            if (!this.byId("leaveTypeSelect").getSelectedKey()) {
                this.byId("leaveTypeSelect").setValueState("Error");
                bValid = false;
            } else {
                this.byId("leaveTypeSelect").setValueState("None");
            }

            // Validate dates
            var oStartDate = this.byId("startDatePicker").getDateValue();
            var oEndDate = this.byId("endDatePicker").getDateValue();

            if (!oStartDate) {
                this.byId("startDatePicker").setValueState("Error");
                bValid = false;
            } else {
                this.byId("startDatePicker").setValueState("None");
            }

            if (!oEndDate) {
                this.byId("endDatePicker").setValueState("Error");
                bValid = false;
            } else {
                this.byId("endDatePicker").setValueState("None");
            }

            if (oStartDate && oEndDate && oStartDate > oEndDate) {
                this.byId("endDatePicker").setValueState("Error");
                bValid = false;
            }

            // Validate reason
            if (!this.byId("reasonTextArea").getValue()) {
                this.byId("reasonTextArea").setValueState("Error");
                bValid = false;
            } else {
                this.byId("reasonTextArea").setValueState("None");
            }

            return bValid;
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            if (oRouter) {
                oRouter.navTo("home", {}, true);
            } else {
                window.location.href = "/";
            }
        }
    });
}); 